import { DependencyList, useEffect, useState } from "react";
import { useSnackbar } from "notistack";
import { Api } from "../client";
import { client } from "../includes";
import { createError, PrimoSerializableError, PrimoValidationError } from "../../../common/errors/errors";
import { parseServerErrors } from "../utils";


export type ApiRequestHookInterface<T> = [T, boolean, Error[] | null, PrimoValidationError[] | null];

export function useApiRequestEffect<T>(requester: (client: Api<unknown>) => Promise<T>, dependencies: DependencyList, defaultData?: Partial<T>): ApiRequestHookInterface<T> {
    const [state, setState] = useState<{
        isLoading: boolean,
        data?: T,
        messages?: PrimoValidationError[],
        errors?: Error[],
    }>({ isLoading: true, data: defaultData as T });
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        async function performRequest() {
            try {
                setState((currentState) => ({ ...currentState, isLoading: true }));
                const response = await requester(client);
                setState({ data, isLoading: false });
            }
            catch (err) {
                const errors = parseServerErrors(err);

                // TODO: Separate out validation errors and return them in the hook return

                errors.forEach(error => {
                    enqueueSnackbar(error.message, { variant: "error" });
                    console.error("API client error", error);
                });

                setState((currentState) => ({
                    ...currentState,
                    isLoading: false,
                    errors,
                }));
            }
        }

        performRequest();

    }, [client, setState, ...dependencies]);

    const { data, isLoading, errors, messages } = state;
    return [data, isLoading, errors, messages];
}

export function useApiRequest<T>(requester: (client: Api<unknown>) => Promise<T>, dependencies: DependencyList, defaultData?: Partial<T>): ApiRequestHookInterface<T> {
    const [state, setState] = useState<{
        isLoading: boolean,
        data?: T,
        messages?: PrimoValidationError[],
        errors?: Error[],
    }>({ isLoading: true, data: defaultData as T });
    const { enqueueSnackbar } = useSnackbar();

    async function performRequest() {
        try {
            setState((currentState) => ({ ...currentState, isLoading: true }));
            const response = await requester(client);
            setState({ data, isLoading: false });
        }
        catch (err) {
            const errors = parseServerErrors(err);

            // TODO: Separate out validation errors and return them in the hook return

            errors.forEach(error => {
                enqueueSnackbar(error.message, { variant: "error" });
                console.error("API client error", error);
            });

            setState((currentState) => ({
                ...currentState,
                isLoading: false,
                errors,
            }));
        }
    }

    performRequest();

    const { data, isLoading, errors, messages } = state;
    return [data, isLoading, errors, messages];
}
