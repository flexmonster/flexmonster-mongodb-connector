import * as Crypto from 'crypto';

export class HashGenerator {

    public static createHashFromString(input: string): string {
        return Crypto.createHash('sha256').update(input).digest('hex');
    }

    public static createHashFromObject(object: any): string {
        return this.createHashFromString(JSON.stringify(object));
    }
}