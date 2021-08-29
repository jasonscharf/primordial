import v8 from "v8";
import { Chromosome } from "../../common/models/genetics/Chromosome";


const structuredClone = obj => {
    return v8.deserialize(v8.serialize(obj));
};


export function clone(genetics: { [key: string]: Chromosome }, apply: { [key: string]: Chromosome }) {
    const cloned = Object.assign({}, genetics, apply);
    return cloned;
}