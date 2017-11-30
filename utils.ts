import QueryError from "./QueryError";

/**
 * Converts an object into a URL search string.
 * @param searchParams
 */
export function objectToSearch(searchParams: { [key: string]: any }) {
    const parts = new Array<string>();

    for (const name in searchParams) {
        if (!searchParams.hasOwnProperty(name)) {
            continue;
        }

        let value = (searchParams as any)[name];
        if (value === undefined) {
            continue;
        }
        value = value.toString();

        parts.push([name, value].map(encodeURIComponent).join("="));
    }

    return parts.join("&");
}

/**
 * Add "/query" to the end of the URL if not already present.
 * @param url feature service layer URL
 */
export function ensureQueryUrl(url: string) {
    // Add "/query" to the end of the URL if not already present.
    if (!/\/query\/?$/.test(url)) {
        url += "/query";
    }
    return url;
}
