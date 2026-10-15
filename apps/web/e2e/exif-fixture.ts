// A phone camera's EXIF APP1 segment (little-endian TIFF): DateTimeOriginal and GPS in Ljubljana. Shared by the
// PhotoPicker unit test (EXIF read) and e2e/photos.spec.ts (the uploaded file has none of it).
export const FIXTURE_EXIF = { lat: 46.0569, lng: 14.5058, takenAt: '2026:10:14 09:30:00' };

export function exifSegment(): Uint8Array<ArrayBuffer> {
	const tiff = new DataView(new ArrayBuffer(178));
	const u16 = (at: number, value: number) => tiff.setUint16(at, value, true);
	const u32 = (at: number, value: number) => tiff.setUint32(at, value, true);
	const entry = (at: number, tag: number, type: number, count: number, value: number) => {
		u16(at, tag);
		u16(at + 2, type);
		u32(at + 4, count);
		u32(at + 8, value);
	};
	const rationals = (at: number, parts: [number, number][]) =>
		parts.forEach(([numerator, denominator], i) => {
			u32(at + i * 8, numerator);
			u32(at + i * 8 + 4, denominator);
		});
	// Header, then IFD0 at 8 with the Exif (38) and GPS (56) IFD pointers.
	u16(0, 0x4949);
	u16(2, 42);
	u32(4, 8);
	u16(8, 2);
	entry(10, 0x8769, 4, 1, 38);
	entry(22, 0x8825, 4, 1, 56);
	// Exif IFD: DateTimeOriginal (ASCII 20 at 110).
	u16(38, 1);
	entry(40, 0x9003, 2, 20, 110);
	// GPS IFD: N 46° 3' 24.84", E 14° 30' 20.88" (rationals at 130 and 154).
	u16(56, 4);
	entry(58, 0x0001, 2, 2, 'N'.charCodeAt(0));
	entry(70, 0x0002, 5, 3, 130);
	entry(82, 0x0003, 2, 2, 'E'.charCodeAt(0));
	entry(94, 0x0004, 5, 3, 154);
	[...FIXTURE_EXIF.takenAt].forEach((char, i) => tiff.setUint8(110 + i, char.charCodeAt(0)));
	rationals(130, [
		[46, 1],
		[3, 1],
		[2484, 100],
	]);
	rationals(154, [
		[14, 1],
		[30, 1],
		[2088, 100],
	]);
	const length = 2 + 6 + tiff.byteLength;
	const head = [0xff, 0xe1, length >> 8, length & 0xff, ...[...'Exif'].map((c) => c.charCodeAt(0)), 0, 0];
	const segment = new Uint8Array(head.length + tiff.byteLength);
	segment.set(head);
	segment.set(new Uint8Array(tiff.buffer), head.length);
	return segment;
}

/** The JPEG with the EXIF segment right after SOI, where cameras write it. */
export function withExif(jpeg: Uint8Array): Uint8Array<ArrayBuffer> {
	const segment = exifSegment();
	const out = new Uint8Array(jpeg.length + segment.length);
	out.set(jpeg.subarray(0, 2));
	out.set(segment, 2);
	out.set(jpeg.subarray(2), 2 + segment.length);
	return out;
}
