import { Knex } from "knex";
import { User } from "../../common/models/user/User";
import { UserEntity } from "../../common/entities/UserEntity";
import { UserIdentity } from "../../common/models/user/UserIdentity";
import { UserIdentityEntity } from "../../common/entities/UserIdentityEntity";
import { db } from "../includes";
import { query } from "../database/utils";
import { tables } from "../constants";


/** 
 * Handles user and user identity concerns, authentication, authorization.
 */
export class UserService {

    /**
     * Inserts a new user. Use to create new users ahead of their first sign in via OAuth.
     * @param user 
     * @returns 
     */
    async insertUser(user: Partial<User>, trx?: Knex.Transaction): Promise<User> {
        const fn = async (trx: Knex.Transaction): Promise<User> => {
            const [newUserRow] = <User[]>await db(tables.Users)
                .transacting(trx)
                .insert(user)
                .returning("*")
                ;

            return UserEntity.fromRow(newUserRow);
        };

        return query(this.insertUserAndIdentity.name, fn, trx);
    }

    /**
     * Inserts a new user and identity into the DB.
     * @param userProps 
     * @param identityProps 
     * @param trx 
     * @returns 
     */
    async insertUserAndIdentity(userProps: Partial<User>, identityProps: Partial<UserIdentity>, trx?: Knex.Transaction): Promise<[User, UserIdentity]> {
        const fn = async (trx: Knex.Transaction): Promise<[User, UserIdentity]> => {
            const [newUserRow] = <User[]>await db(tables.Users)
                .transacting(trx)
                .insert(userProps)
                .returning("*")
                ;

            const identProps = Object.assign({}, identityProps, {
                userId: newUserRow.id,
            });

            const [newIdentityRow] = <UserIdentity[]>await db(tables.UserIdentities)
                .insert(identProps)
                .returning("*")
                ;

            return [UserEntity.fromRow(newUserRow), UserIdentityEntity.fromRow(newIdentityRow)];
        };

        return query(this.insertUserAndIdentity.name, fn, trx);
    }

    /**
     * Updates an existing user record.
     * @param userProps
     * @returns 
     */
    async updateUser(userProps: Partial<User>, trx?: Knex.Transaction) {
        const fn = async (trx: Knex.Transaction) => {
            const { id } = userProps;
            const [updatedUser] = <User[]>await db(tables.Users)
                .transacting(trx)
                .where({ id })
                .update(userProps)
                .returning("*")
                ;

            return updatedUser;
        };

        return query(this.updateUser.name, fn);
    }
}
