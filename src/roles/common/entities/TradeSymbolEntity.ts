import { ImmutableEntity } from "../models/ImmutableEntity";
import { TradeSymbol, TradeSymbolType } from "../models/markets/TradeSymbol";


export class TradeSymbolEntity extends ImmutableEntity implements TradeSymbol {
    typeId: TradeSymbolType;
    sign: string;
    displayUnits: number;


    constructor(row?: Partial<TradeSymbol>) {
        super(row);

        if (row) {
            this.typeId = row.typeId;
            this.sign = row.sign;
            this.displayUnits = row.displayUnits;
        }
    }

    static fromRow(row?: Partial<TradeSymbol>) {
        return row ? new TradeSymbolEntity(row) : null;
    }
}
