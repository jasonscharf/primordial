export type QueryOrderDirection = "ASC" | "DESC";
export interface CommonQueryArgs {
    limit?: number;
    orderBy?: string;
    orderDir?: QueryOrderDirection;
    page?: number;
    pageSize?: number;
}
