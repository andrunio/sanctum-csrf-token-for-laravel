const LaravelSanctumCsrf = function () {

    this.evaluate = function (context) {

        const request = context.getCurrentRequest(),
            cookies = (request.getHeaderByName('Cookie')).split(';'),
            getCookie = function (name) {
                for (let i = 0; i < cookies.length; i++) {
                    if (cookies[i].split('=')[0].trim() === name) {
                        return decodeURIComponent(cookies[i].split('=')[1]);
                    }
                }
            };

        return getCookie('XSRF-TOKEN');
    }
};

LaravelSanctumCsrf.identifier = 'com.a_vasyukov.LaravelSanctumCsrf';
LaravelSanctumCsrf.title = 'Laravel Sanctum CSRF';

registerDynamicValueClass(LaravelSanctumCsrf);
