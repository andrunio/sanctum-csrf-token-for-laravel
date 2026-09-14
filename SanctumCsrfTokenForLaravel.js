const SanctumCsrfTokenForLaravel = function () {

    const cookieName = 'XSRF-TOKEN';

    const readCookie = function (header, name) {
        const cookies = header.split(';');

        for (let i = 0; i < cookies.length; i++) {
            const separator = cookies[i].indexOf('=');

            if (separator === -1) {
                continue;
            }

            if (cookies[i].slice(0, separator).trim() === name) {
                return decodeURIComponent(cookies[i].slice(separator + 1).trim());
            }
        }

        return '';
    };

    // Set-Cookie appends attributes after ';' and stacks several cookies behind ','.
    const readSetCookie = function (header, name) {
        const match = header.match(new RegExp('(?:^|[;,\\s])' + name + '=([^;,]*)'));

        return match ? decodeURIComponent(match[1].trim()) : '';
    };

    this.evaluate = function (context) {
        const currentRequest = context.getCurrentRequest();
        const sourceRequest = this.sourceRequest;

        // The picker defaults to Current Request, and the host hands back that very object.
        if (sourceRequest && sourceRequest.id !== currentRequest.id) {
            const exchange = sourceRequest.getLastExchange();
            const setCookie = exchange && exchange.getResponseHeaderByName('Set-Cookie');

            return readSetCookie(String(setCookie || ''), cookieName);
        }

        return readCookie(currentRequest.getHeaderByName('Cookie') || '', cookieName);
    };

    this.title = function (context) {
        return 'Sanctum CSRF';
    };

    this.text = function (context) {
        return cookieName;
    };
};

SanctumCsrfTokenForLaravel.identifier = 'com.andrunio.SanctumCsrfTokenForLaravel';
SanctumCsrfTokenForLaravel.title = 'Sanctum CSRF Token for Laravel';
SanctumCsrfTokenForLaravel.help = 'https://github.com/andrunio/sanctum-csrf-token-for-laravel#readme';

SanctumCsrfTokenForLaravel.inputs = [
    DynamicValueInput('sourceRequest', 'Source request', 'Request')
];

registerDynamicValueClass(SanctumCsrfTokenForLaravel);
