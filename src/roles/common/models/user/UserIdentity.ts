import { MutableEntity } from "../MutableEntity";


export enum UserIdentityProvider {
    EMAIL = "email",
}

export interface UserIdentity extends MutableEntity {
    provider: UserIdentityProvider;
    pid: string;
    userId: string;
    nameFirst: string;
    nameMiddle: string;
    nameLast: string;
}
