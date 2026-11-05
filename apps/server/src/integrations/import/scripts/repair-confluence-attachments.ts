/**
 * Repairs attachments created by older Confluence XML-export imports.
 *
 * Those imports stored files from attachments/{pageId}/{attachmentId}/{version}
 * with file_name "1" (the version number), an empty file_ext and mime_type
 * application/octet-stream. Videos embedded with <ac:image> also became
 * image nodes, and attachment nodes got mime "application/octet-stream".
 *
 * The fix is DB-only. Files on disk are never renamed or moved.
 *  - attachments: file_name, file_ext and mime_type are set from the name kept
 *    in the page content (image alt / attachment name), from entities.xml
 *    (optional, matched by file size) or by sniffing the file's magic bytes.
 *  - pages: video files shown as image/attachment nodes become video nodes,
 *    and attachment nodes get the correct mime/name. ydoc is set to NULL so
 *    the collaboration server rebuilds it from the repaired content.
 *
 * Usage (from apps/server):
 *   pnpm exec tsx src/integrations/import/scripts/repair-confluence-attachments.ts [options]
 *
 * Options:
 *   --write                Apply the changes. Without it, only print the plan (dry run).
 *   --sql-out <file>       Also write the generated SQL to a file for review.
 *   --export-dir <dir>     Confluence export folder (with entities.xml) for name lookup by size.
 *   --storage-root <dir>   Read files from this local folder instead of the app container.
 *   --no-content           Fix attachment rows only; do not touch page content.
 *   --db-container <name>  Default: docmost-db-1
 *   --app-container <name> Default: docmost-altwiki-1
 *   --db-user <name>       Default: docmost
 *   --db-name <name>       Default: docmost
 */
import { execFileSync } from 'child_process';
import { promises as fs, readFileSync } from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

type Args = {
  write: boolean;
  sqlOut?: string;
  exportDir?: string;
  storageRoot?: string;
  content: boolean;
  dbContainer: string;
  appContainer: string;
  dbUser: string;
  dbName: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    write: false,
    content: true,
    dbContainer: 'docmost-db-1',
    appContainer: 'docmost-altwiki-1',
    dbUser: 'docmost',
    dbName: 'docmost',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (!v) throw new Error(`Missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--write':
        args.write = true;
        break;
      case '--dry-run':
        args.write = false;
        break;
      case '--sql-out':
        args.sqlOut = next();
        break;
      case '--export-dir':
        args.exportDir = next();
        break;
      case '--storage-root':
        args.storageRoot = next();
        break;
      case '--no-content':
        args.content = false;
        break;
      case '--db-container':
        args.dbContainer = next();
        break;
      case '--app-container':
        args.appContainer = next();
        break;
      case '--db-user':
        args.dbUser = next();
        break;
      case '--db-name':
        args.dbName = next();
        break;
      default:
        throw new Error(`Unknown option: ${a}`);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

function psqlQuery(sql: string): string {
  return execFileSync(
    'docker',
    [
      'exec',
      '-i',
      args.dbContainer,
      'psql',
      '-U',
      args.dbUser,
      '-d',
      args.dbName,
      '-v',
      'ON_ERROR_STOP=1',
      '-tA',
      '-c',
      sql,
    ],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512 },
  );
}

function psqlJson<T>(sql: string): T[] {
  const out = psqlQuery(
    `select coalesce(json_agg(t), '[]'::json) from (${sql}) t`,
  ).trim();
  return JSON.parse(out || '[]');
}

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

// ---------- magic byte sniffing ----------

function sniffMime(buf: Buffer): string | null {
  const hex = buf.toString('hex');
  const ascii = buf.toString('latin1');
  if (hex.startsWith('89504e470d0a1a0a')) return 'image/png';
  if (hex.startsWith('ffd8ff')) return 'image/jpeg';
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a'))
    return 'image/gif';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP')
    return 'image/webp';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'AVI ')
    return 'video/x-msvideo';
  if (ascii.startsWith('BM')) return 'image/bmp';
  if (hex.startsWith('49492a00') || hex.startsWith('4d4d002a'))
    return 'image/tiff';
  if (ascii.startsWith('%PDF')) return 'application/pdf';
  if (hex.startsWith('1a45dfa3')) return 'video/webm';
  if (ascii.slice(4, 8) === 'ftyp') {
    const brand = ascii.slice(8, 12);
    if (brand === 'qt  ') return 'video/quicktime';
    if (brand.startsWith('M4A')) return 'audio/mp4';
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand === 'heic' || brand === 'heix' || brand === 'mif1')
      return 'image/heic';
    return 'video/mp4';
  }
  if (ascii.startsWith('OggS')) return 'application/ogg';
  if (ascii.startsWith('ID3') || hex.startsWith('fffb')) return 'audio/mpeg';
  if (hex.startsWith('504b0304')) return 'application/zip';
  if (hex.startsWith('d0cf11e0a1b11ae1')) return 'application/x-ole-storage';
  const text = ascii.trimStart().toLowerCase();
  if (text.startsWith('<svg') || (text.startsWith('<?xml') && text.includes('<svg')))
    return 'image/svg+xml';
  return null;
}

async function readHeads(filePaths: string[]): Promise<Map<string, Buffer>> {
  const heads = new Map<string, Buffer>();
  if (filePaths.length === 0) return heads;

  if (args.storageRoot) {
    for (const p of filePaths) {
      try {
        const fh = await fs.open(path.join(args.storageRoot, p), 'r');
        const buf = Buffer.alloc(64);
        const { bytesRead } = await fh.read(buf, 0, 64, 0);
        await fh.close();
        heads.set(p, buf.subarray(0, bytesRead));
      } catch {
        // missing file: leave unset
      }
    }
    return heads;
  }

  // Read-only: one node process in the app container prints the first 64
  // bytes (hex) of each requested file.
  const reader = `
    const fs = require('fs');
    const paths = JSON.parse(fs.readFileSync(0, 'utf8'));
    const out = {};
    for (const p of paths) {
      try {
        const fd = fs.openSync('/app/data/storage/' + p, 'r');
        const b = Buffer.alloc(64);
        const n = fs.readSync(fd, b, 0, 64, 0);
        fs.closeSync(fd);
        out[p] = b.subarray(0, n).toString('hex');
      } catch (e) { out[p] = null; }
    }
    process.stdout.write(JSON.stringify(out));
  `;
  const out = execFileSync(
    'docker',
    ['exec', '-i', args.appContainer, 'node', '-e', reader],
    { input: JSON.stringify(filePaths), encoding: 'utf8' },
  );
  const parsed: Record<string, string | null> = JSON.parse(out);
  for (const [p, hex] of Object.entries(parsed)) {
    if (hex !== null) heads.set(p, Buffer.from(hex, 'hex'));
  }
  return heads;
}

// ---------- entities.xml (optional) ----------

function loadExportNamesBySize(exportDir: string): Map<number, string[]> {
  const xml = readFileSync(path.join(exportDir, 'entities.xml'), 'utf8');
  const sizeByProp = new Map<string, number>();
  const propRe =
    /<object class="ContentProperty"[^>]*>\s*<id name="id">(\d+)<\/id>\s*<property name="name"><!\[CDATA\[FILESIZE\]\]><\/property>[\s\S]*?<property name="longValue">(\d+)<\/property>/g;
  for (const m of xml.matchAll(propRe)) sizeByProp.set(m[1], Number(m[2]));

  const bySize = new Map<number, string[]>();
  const attRe = /<object class="Attachment"[^>]*>([\s\S]*?)<\/object>/g;
  for (const m of xml.matchAll(attRe)) {
    const body = m[1];
    if (body.includes('name="originalVersion"')) continue;
    const title = body.match(/<property name="title"><!\[CDATA\[([\s\S]*?)\]\]>/)?.[1];
    if (!title) continue;
    const coll = body.match(/<collection name="contentProperties"[\s\S]*?<\/collection>/)?.[0] ?? '';
    for (const idm of coll.matchAll(/<id name="id">(\d+)<\/id>/g)) {
      const size = sizeByProp.get(idm[1]);
      if (size !== undefined) {
        const list = bySize.get(size) ?? [];
        if (!list.includes(title)) list.push(title);
        bySize.set(size, list);
      }
    }
  }
  return bySize;
}

// ---------- main ----------

type AttachmentRow = {
  id: string;
  file_name: string;
  file_ext: string | null;
  file_path: string;
  file_size: number | null;
  mime_type: string;
  page_id: string | null;
};

type PageRow = { id: string; title: string | null; content: any; md5: string };

type Fix = {
  id: string;
  fileName: string;
  fileExt: string;
  mimeType: string;
  source: string;
};

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

function walk(node: any, visit: (node: any) => any): any {
  if (!node || typeof node !== 'object') return node;
  const replaced = visit(node);
  if (replaced !== node) return replaced;
  if (Array.isArray(node.content)) {
    node.content = node.content.map((child: any) => walk(child, visit));
  }
  return node;
}

async function main() {
  const rows = psqlJson<AttachmentRow>(`
    select id, file_name, file_ext, file_path, file_size, mime_type, page_id
    from attachments
    where deleted_at is null
      and mime_type = 'application/octet-stream'
      and (file_ext is null or file_ext = '')
    order by created_at`);

  console.log(`Found ${rows.length} attachment(s) with octet-stream mime and no extension.`);
  if (rows.length === 0) return;

  const pageIds = Array.from(
    new Set(rows.map((r) => r.page_id).filter(Boolean)),
  ) as string[];
  const pages = pageIds.length
    ? psqlJson<PageRow>(`
        select id, title, content, md5(content::text) as md5
        from pages
        where id in (${pageIds.map(sqlLiteral).join(',')})`)
    : [];
  const pageById = new Map(pages.map((p) => [p.id, p]));

  // Names stored in content nodes (image alt / attachment name)
  const nameFromContent = new Map<string, string>();
  for (const p of pages) {
    walk(p.content, (n) => {
      const id = n?.attrs?.attachmentId;
      if (id) {
        const candidate =
          n.type === 'attachment' ? n.attrs.name : n.type === 'image' ? n.attrs.alt : null;
        if (candidate && candidate !== '1' && path.extname(candidate)) {
          nameFromContent.set(id, candidate);
        }
      }
      return n;
    });
  }

  const namesBySize = args.exportDir ? loadExportNamesBySize(args.exportDir) : null;
  const heads = await readHeads(rows.map((r) => r.file_path));

  const fixes = new Map<string, Fix>();
  const skipped: string[] = [];
  const warnings: string[] = [];

  for (const row of rows) {
    const head = heads.get(row.file_path);
    const sniffed = head ? sniffMime(head) : null;
    if (!head) warnings.push(`${row.id}: file not readable at ${row.file_path}`);

    let name = nameFromContent.get(row.id);
    let source = 'content';
    if (!name && namesBySize && row.file_size != null) {
      const names = namesBySize.get(Number(row.file_size));
      if (names?.length === 1) {
        name = names[0];
        source = 'entities.xml';
      }
    }

    let mimeType: string | null = null;
    let ext = '';
    if (name) {
      ext = path.extname(name).toLowerCase();
      mimeType = mime.lookup(name) || null;
      // Trust the bytes when they clearly disagree with the name's family
      if (
        sniffed &&
        mimeType &&
        sniffed.split('/')[0] !== mimeType.split('/')[0] &&
        sniffed !== 'application/zip'
      ) {
        warnings.push(
          `${row.id}: name "${name}" says ${mimeType}, bytes say ${sniffed}; using ${sniffed}`,
        );
        mimeType = sniffed;
      }
      if (!mimeType && sniffed) mimeType = sniffed;
    } else if (sniffed) {
      mimeType = sniffed;
      const e = mime.extension(sniffed);
      ext = e ? `.${e}` : '';
      name = `file-${row.id.slice(-8)}${ext}`;
      source = 'magic bytes';
    }

    if (!name || !mimeType) {
      skipped.push(`${row.id} (${row.file_path}): no name and unknown file type`);
      continue;
    }

    fixes.set(row.id, { id: row.id, fileName: name, fileExt: ext, mimeType, source });
  }

  // Page content rewrites
  const pageUpdates: { page: PageRow; content: any; changes: string[] }[] = [];
  if (args.content) {
    for (const page of pages) {
      const changes: string[] = [];
      const content = JSON.parse(JSON.stringify(page.content));
      walk(content, (n) => {
        const fix = n?.attrs?.attachmentId ? fixes.get(n.attrs.attachmentId) : undefined;
        if (!fix) return n;

        if ((n.type === 'image' || n.type === 'attachment') && isVideo(fix.mimeType)) {
          changes.push(`${n.type} -> video (${fix.fileName})`);
          return {
            type: 'video',
            attrs: {
              src: n.attrs.src ?? n.attrs.url,
              attachmentId: n.attrs.attachmentId,
              width: n.type === 'image' ? n.attrs.width ?? '100%' : '100%',
              size: n.attrs.size ?? null,
              align: n.attrs.align ?? 'center',
              aspectRatio: null,
              placeholder: null,
            },
          };
        }
        if (n.type === 'attachment') {
          const before = `${n.attrs.name}|${n.attrs.mime}`;
          if (!n.attrs.mime || n.attrs.mime === 'application/octet-stream') {
            n.attrs.mime = fix.mimeType;
          }
          if (!n.attrs.name || n.attrs.name === '1') n.attrs.name = fix.fileName;
          if (before !== `${n.attrs.name}|${n.attrs.mime}`) {
            changes.push(`attachment mime/name -> ${n.attrs.mime} (${n.attrs.name})`);
          }
        }
        return n;
      });
      if (changes.length) pageUpdates.push({ page, content, changes });
    }
  }

  // ---------- report ----------
  console.log(`\nAttachment fixes (${fixes.size}):`);
  const bySource: Record<string, number> = {};
  const byMime: Record<string, number> = {};
  for (const f of fixes.values()) {
    bySource[f.source] = (bySource[f.source] || 0) + 1;
    byMime[f.mimeType] = (byMime[f.mimeType] || 0) + 1;
    console.log(`  ${f.id}  1 -> ${f.fileName}  [${f.fileExt || '-'}] ${f.mimeType}  (from ${f.source})`);
  }
  console.log(`\nPage content updates (${pageUpdates.length}):`);
  for (const u of pageUpdates) {
    console.log(`  ${u.page.id} "${u.page.title ?? ''}"`);
    for (const c of u.changes) console.log(`    - ${c}`);
  }
  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  ${w}`));
  }
  if (skipped.length) {
    console.log(`\nSkipped (${skipped.length}):`);
    skipped.forEach((s) => console.log(`  ${s}`));
  }
  console.log(`\nSummary: ${fixes.size} attachment(s) to fix, ${pageUpdates.length} page(s) to rewrite, ${skipped.length} skipped.`);
  console.log(`  by source: ${JSON.stringify(bySource)}`);
  console.log(`  by mime:   ${JSON.stringify(byMime)}`);

  // ---------- SQL ----------
  const sql: string[] = ['BEGIN;'];
  for (const f of fixes.values()) {
    sql.push(
      `UPDATE attachments SET file_name = ${sqlLiteral(f.fileName)}, file_ext = ${sqlLiteral(f.fileExt)}, ` +
        `mime_type = ${sqlLiteral(f.mimeType)}, updated_at = now() ` +
        `WHERE id = ${sqlLiteral(f.id)} AND mime_type = 'application/octet-stream';`,
    );
  }
  for (const u of pageUpdates) {
    const tag = `json_${Math.random().toString(36).slice(2, 10)}`;
    const json = JSON.stringify(u.content);
    if (json.includes(`$${tag}$`)) throw new Error('dollar-quote tag collision');
    // Abort everything if the page changed since it was read.
    sql.push(
      `DO $do$ BEGIN\n` +
        `  UPDATE pages SET content = $${tag}$${json}$${tag}$::jsonb, ydoc = NULL\n` +
        `  WHERE id = ${sqlLiteral(u.page.id)} AND md5(content::text) = ${sqlLiteral(u.page.md5)};\n` +
        `  IF NOT FOUND THEN RAISE EXCEPTION 'page % changed since dry run', ${sqlLiteral(u.page.id)}; END IF;\n` +
        `END $do$;`,
    );
  }
  sql.push('COMMIT;');
  const sqlText = sql.join('\n') + '\n';

  if (args.sqlOut) {
    await fs.writeFile(args.sqlOut, sqlText);
    console.log(`\nSQL written to ${args.sqlOut}`);
  }

  if (!args.write) {
    console.log('\nDry run: nothing changed. Re-run with --write to apply.');
    return;
  }

  console.log('\nApplying changes in one transaction...');
  execFileSync(
    'docker',
    ['exec', '-i', args.dbContainer, 'psql', '-U', args.dbUser, '-d', args.dbName, '-v', 'ON_ERROR_STOP=1', '-q'],
    { input: sqlText, stdio: ['pipe', 'inherit', 'inherit'] },
  );
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
