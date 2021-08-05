import { Price } from "../../common/models/system/Price";
import { PriceEntity } from "../../common/entities/PriceEntity";
import { TradeSymbol } from "../../common/models/markets/TradeSymbol";
import { TradeSymbolEntity } from "../../common/entities/TradeSymbolEntity";
import { db } from "../includes";
import { query } from "../database/utils";
import { tables } from "../constants";


/**
 * Handles the reading and writing of tradeable symbol pairs.
 * For equities, USD can be assumed to be the quote side.
 */
export class SymbolService {

    /**
     * Adds a single symbol price to the database.
     * @param props
     * @returns 
     */
    async addSymbolPrice(props: Partial<Price>): Promise<Price> {
        return query("symbol-add-price", async trx => {
 
            // Ensure we are reflecting the raw (string-form) values as well (for now)
            const priceProps: Partial<Price> = Object.assign({}, props, <Partial<Price>>{
                openRaw: props.open.toString(),
                closeRaw: props.close.toString(),
                lowRaw: props.low.toString(),
                highRaw: props.high.toString(),
            });

            const cols = [
                "baseSymbolId",
                "quoteSymbolId",
                "exchangeId",
                "resId",
                "ts",
                "open",
                "high",
                "low",
                "close",
                "volume",
                "openRaw",
                "highRaw",
                "lowRaw",
                "closeRaw",
            ].map(col => `"${col}"`);

            const { rows } = await db
                .raw(`INSERT INTO ${tables.Prices} (${cols.join(", ")}) VALUES (?, ?, ?, ?, ?, ?::decimal, ?::decimal, ?::decimal, ?::decimal, ?, ?, ?, ?, ?) RETURNING *`, [
                    priceProps.baseSymbolId,
                    priceProps.quoteSymbolId,
                    priceProps.exchangeId,
                    priceProps.resId,
                    priceProps.ts,
                    priceProps.open.toString(),
                    priceProps.high.toString(),
                    priceProps.low.toString(),
                    priceProps.close.toString(),
                    priceProps.volume,
                    priceProps.openRaw,
                    priceProps.highRaw,
                    priceProps.lowRaw,
                    priceProps.closeRaw,
                ])
                .transacting(trx)
                ;

            return PriceEntity.fromRow(rows[0]);
        });
    }

    /**
     * Adds a new unique trade symbol to the DB, e.g. a cryptocurrency or an equity.
     * Every symbol (including equities) has a base symbol (the asset) and a quote symbol (e.g. BTC, USD, CAD, etc)
     * @param props 
     * @returns 
     */
    async addSymbol(props: Partial<TradeSymbol>): Promise<TradeSymbol> {
        return query("symbol-add", async trx => {
            const [row] = <TradeSymbol[]>await db(tables.TradeSymbols)
                .transacting(trx)
                .insert(props)
                .returning("*")
                ;

            return TradeSymbolEntity.fromRow(row);
        });
    }
}
