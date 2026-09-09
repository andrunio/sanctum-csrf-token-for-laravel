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

    this.evaluate = function (context) {
        const request = context.getCurrentRequest();

        return readCookie(request.getHeaderByName('Cookie') || '', cookieName);
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

registerDynamicValueClass(SanctumCsrfTokenForLaravel);
