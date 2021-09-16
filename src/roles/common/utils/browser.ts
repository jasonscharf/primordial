/**
 * Builds a query string from the top-level keys of the given object.
 * @param args
 */
 export function buildQueryString(args: { [key: string]: any }) {
    if (!args) {
        return "";
    }
    const query = Object.keys(args)
        .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(args[key]))
        .join("&");

    return query;
}

/**
 * Returns a simple object with query args.
 * Does not handle foo=1&foo=2&foo=3 overloading.
 * @param queryString 
 */
export function buildQueryObject(queryString: string) {
    const qs = queryString.substring(queryString.indexOf('?') + 1).split('&');
    const params = {}, d = decodeURIComponent;

    for (var i = qs.length - 1; i >= 0; i--) {
        const pair = qs[i].split('=');
        params[d(pair[0])] = d(pair[1] || '');
    }

    return params;
}
