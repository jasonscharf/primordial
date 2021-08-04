import { Knex } from "knex";
import { User } from "../../common/models/user/User";
import { UserIdentity } from "../../common/models/user/UserIdentity";
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
    async insertUser(user: Partial<User>): Promise<User> {
        const [newUser] = <User[]>await db(tables.Users)
            .insert(user)
            .returning("*")
            ;

        return newUser;
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
            const [newUser] = <User[]>await db(tables.Users)
                .transacting(trx)
                .insert(userProps)
                .returning("*")
                ;

            const identProps = Object.assign({}, identityProps, {
                userId: newUser.id,
            });

            const newIdentity = <UserIdentity>await db(tables.UserIdentities)
                .insert(identProps)
                ;

            await trx.commit();

            return [newUser, newIdentity];
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
