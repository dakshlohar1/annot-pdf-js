export type Base64 = string;

export function base64ToArrayBuffer(base64: Base64): ArrayBuffer {
  const [, data] = base64.split(",");
  const binaryString = atob(data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
