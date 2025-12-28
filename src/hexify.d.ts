declare module 'hexify' {
    export function toHexString(data: number[] | Buffer | Uint8Array): string;
    export function toByteArray(hexString: string): number[];
}
