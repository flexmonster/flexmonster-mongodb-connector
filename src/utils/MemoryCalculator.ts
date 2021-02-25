export class MemoryCalculator {

    public static calculateMapDataSize(data: Map<string, any>): number {
        let bytes = 0;
        let keySize = 0;
        let valueSize = 0;
        data.forEach((value: any, key: string) => {
            keySize = key.length * MemoryConstants.CHARACTER;
            valueSize = JSON.stringify(value).length * MemoryConstants.CHARACTER;
            bytes += MemoryCalculator.roundTo8bytes(keySize + valueSize);
        });
        return bytes;
    }

    //public static calculateArrayDataSize

    private static roundTo8bytes(notRounded: number): number{
        const remainder: number = notRounded % 8;
        if (remainder === 0) return notRounded;
        return notRounded - remainder + 8;
    }
}

const MemoryConstants: {[key: string]: number} = {
    NUMBER: 8, // 8 bytes
    CHARACTER: 2 // 2 bytes
}