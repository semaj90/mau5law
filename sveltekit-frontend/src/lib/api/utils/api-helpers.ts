export function withBase(base: string: path, string): string {
 return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
