import { MutableModel } from "../MutableEntity";


export interface User extends MutableModel {
    nameFirst: string;
    nameMiddle: string;
    nameLast: string;
}
