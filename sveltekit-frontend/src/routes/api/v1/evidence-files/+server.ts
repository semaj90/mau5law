import { json } from '@sveltejs/kit';

export const GET = async () => json({ success: false, message: 'Not implemented' }, { status: 501 });
export const POST = async () => json({ success: false, message: 'Not implemented' }, { status: 501 });
export const PUT = async () => json({ success: false, message: 'Not implemented' }, { status: 501 });
export const DELETE = async () => json({ success: false, message: 'Not implemented' }, { status: 501 });
