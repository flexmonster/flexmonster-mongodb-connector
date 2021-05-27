import { FlatResultDataInterface } from "../cache/dataObject/impl/FlatRequestDataObject";

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

    public static calculateMemberObjectSize(stringContent: string[] = [], numberOfNumericReferences: number = 0): number {
        let objectSize: number = 2 * MemoryConstants.REFERENCE; //refference to hidden classes

        for (let i = 0; i < stringContent.length; i++) {
            objectSize += MemoryConstants.REFERENCE + MemoryConstants.CHARACTER * stringContent[i].length; 
        }

        objectSize += (MemoryConstants.REFERENCE + MemoryConstants.NUMBER) * numberOfNumericReferences;

        return this.roundTo8bytes(objectSize);
    }

    public static calculateFlatDataSize(flatData: FlatResultDataInterface): number {
        let dataSize: number = 2 * MemoryConstants.REFERENCE; //refference to hidden classes
        dataSize += Object.keys(flatData).length * MemoryConstants.REFERENCE;

        let fieldsArraySize: number = 2 * MemoryConstants.REFERENCE; //refference to hidden classes
        for (let i = 0; i < flatData.fields.length; i++) {
            fieldsArraySize += 2 * MemoryConstants.REFERENCE + flatData.fields[i]["uniqueName"].length * MemoryConstants.CHARACTER;
        }

        let aggsArraySize = 0;
        if (typeof flatData.aggs !== "undefined") {
            aggsArraySize += 2 * MemoryConstants.REFERENCE; // reference to hidden classes for array 
            if (typeof flatData.aggs[0] !== "undefined") {
                aggsArraySize += 2 * MemoryConstants.REFERENCE + Object.keys(flatData.aggs[0]).length * MemoryConstants.REFERENCE; // refference to hidden class + references
                if (typeof flatData.aggs[0]["value"] !== "undefined") {
                    aggsArraySize += 2 * MemoryConstants.REFERENCE + Object.keys(flatData.aggs[0]["value"]).length * (MemoryConstants.REFERENCE + MemoryConstants.NUMBER);
                }
            }
        }

        dataSize += fieldsArraySize + aggsArraySize;

        return this.roundTo8bytes(dataSize);
    }

    public static roundTo8bytes(notRounded: number): number{
        const remainder: number = notRounded % 8;
        if (remainder === 0) return notRounded;
        return notRounded - remainder + 8;
    }
}

export const MemoryConstants = {
    NUMBER: 8, // 8 bytes
    CHARACTER: 2, // 2 bytes
    REFERENCE: 8
}