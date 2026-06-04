import { NextResponse } from 'next/server';
import { join } from 'path';

const CONFIG_PATH = join(process.cwd(), 'db', 'sync-config.json');

const DEFAULT_CONFIG = {
  apiKey: 'roam-sync-key-2025',
  enabled: true,
  schedule: 'every 6 hours',
  webhookUrl: '',
  lastSync: null,
  lastSyncStatus: null,
};

export async function GET() {
  try {
    // Dynamic import of fs inside handler
    const fs = await import('fs/promises');

    let config: Record<string, unknown> = { ...DEFAULT_CONFIG };

    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      // Config file doesn't exist yet - return defaults
    }

    // Mask the API key
    const maskedKey = maskApiKey(String(config.apiKey || DEFAULT_CONFIG.apiKey));

    return NextResponse.json({
      ...config,
      apiKey: maskedKey,
    });
  } catch (error) {
    console.error('Sync config read error:', error);
    return NextResponse.json(
      { error: 'Failed to read sync config', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const fs = await import('fs/promises');

    // Read existing config or use defaults
    let config: Record<string, unknown> = { ...DEFAULT_CONFIG };
    try {
      const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
      config = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      // Use defaults
    }

    // Update allowed fields
    if (body.apiKey !== undefined && body.apiKey !== '') {
      // Only update if the key is not masked (not starts with "roam-****")
      if (!String(body.apiKey).includes('****')) {
        config.apiKey = body.apiKey;
      }
    }
    if (body.enabled !== undefined) config.enabled = body.enabled;
    if (body.schedule !== undefined) config.schedule = body.schedule;
    if (body.webhookUrl !== undefined) config.webhookUrl = body.webhookUrl;

    // Save config
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');

    // Mask the API key in response
    const maskedKey = maskApiKey(String(config.apiKey || DEFAULT_CONFIG.apiKey));

    return NextResponse.json({
      message: 'Config saved successfully',
      config: {
        ...config,
        apiKey: maskedKey,
      },
    });
  } catch (error) {
    console.error('Sync config save error:', error);
    return NextResponse.json(
      { error: 'Failed to save sync config', details: String(error) },
      { status: 500 }
    );
  }
}

function maskApiKey(key: string): string {
  if (!key || key.length < 6) return '****';
  const parts = key.split('-');
  if (parts.length >= 3) {
    return `${parts[0]}-****-${parts[parts.length - 1]}`;
  }
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}
