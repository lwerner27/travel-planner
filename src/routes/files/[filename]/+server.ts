import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import path from 'node:path';

export async function GET({ params }) {
	const { filename } = params;
	const UPLOADS_DIR = path.resolve('uploads');
	const filePath = path.resolve(UPLOADS_DIR, filename);

	// Security: Prevent directory traversal by ensuring the resolved path is within UPLOADS_DIR
	if (!filePath.startsWith(UPLOADS_DIR)) {
		throw error(403, 'Forbidden');
	}

	if (!fs.existsSync(filePath)) {
		throw error(404, 'File not found');
	}

	const fileBuffer = fs.readFileSync(filePath);
	
	const ext = path.extname(filename).toLowerCase();
	const contentTypes: Record<string, string> = {
		'.pdf': 'application/pdf',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.webp': 'image/webp',
		'.svg': 'image/svg+xml',
		'.txt': 'text/plain'
	};
	
	const contentType = contentTypes[ext] || 'application/octet-stream';

	return new Response(fileBuffer, {
		headers: {
			'Content-Type': contentType,
			// Add a header to suggest opening in browser vs downloading
			'Content-Disposition': `inline; filename="${filename}"`
		}
	});
}
