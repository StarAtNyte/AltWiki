import { credentialEnvKey } from '../oauth/credential-env';
import { Injectable } from '@nestjs/common';
import {
  IntegrationDefinition,
  IntegrationProvider,
} from './integration-provider.interface';

// Docmost Cloud only offers the providers it has OAuth apps for.
const CLOUD_INTEGRATION_TYPES = new Set(['github', 'gitlab', 'linear']);

@Injectable()
export class IntegrationRegistry {
  private providers = new Map<string, IntegrationProvider>();

  constructor(private readonly cloud = false) {}

  register(provider: IntegrationProvider): void {
    const { type } = provider.definition;
    if (this.providers.has(type)) {
      throw new Error(`Integration provider "${type}" is already registered`);
    }
    if (this.cloud && !CLOUD_INTEGRATION_TYPES.has(type)) {
      provider.definition.hidden = true;
    }
    this.providers.set(type, provider);
  }

  getProvider(type: string): IntegrationProvider | undefined {
    return this.providers.get(type);
  }

  getAllProviders(): IntegrationProvider[] {
    return Array.from(this.providers.values());
  }

  getAvailableIntegrations(): (IntegrationDefinition & {
    configured: boolean;
    missingEnv: string[];
  })[] {
    return this.getAllProviders()
      .map((p) => p.definition)
      .filter((definition) => !definition.hidden)
      .map((definition) => {
        // AltWiki: OAuth providers need an app registered at the provider.
        // Report which env vars are missing so the UI can disable Install
        // instead of failing with "Missing environment variable".
        const missingEnv = definition.oauth
          ? (['CLIENT_ID', 'CLIENT_SECRET'] as const)
              .map((field) =>
                credentialEnvKey(field, definition.type, definition.oauth),
              )
              .filter((key) => !process.env[key])
          : [];
        return { ...definition, configured: missingEnv.length === 0, missingEnv };
      });
  }

  findUnfurlProvider(
    url: string,
  ): {
    provider: IntegrationProvider;
    match: RegExpMatchArray;
    patternType: string;
  } | null {
    for (const provider of this.providers.values()) {
      if (!provider.definition.unfurlPatterns) continue;
      for (const pattern of provider.definition.unfurlPatterns) {
        const match = url.match(pattern.regex);
        if (match) {
          return { provider, match, patternType: pattern.type };
        }
      }
    }
    return null;
  }
}
