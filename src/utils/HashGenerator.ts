import * as Crypto from 'crypto';

export class HashGenerator {

    public static createHashFromString(input: string): string {
        return Crypto.createHash('sha512').update(input).digest('hex');
    }
}