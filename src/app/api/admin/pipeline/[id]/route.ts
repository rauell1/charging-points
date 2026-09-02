import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

const VALID_STATUSES = ['new', 'approved', 'on_hold', 'rejected', 'deployed'];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json() as { status?: string };
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: 'status is required' }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 },
    );
  }

  const site = await db.pipelineSite.findUnique({ where: { id } });
  if (!site) {
    return NextResponse.json({ error: 'Pipeline site not found' }, { status: 404 });
  }

  const updated = await db.pipelineSite.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({
    success: true,
    site: { id: updated.id, siteId: updated.siteId, status: updated.status },
    message: `${site.landmark} → ${status}`,
  });
}
