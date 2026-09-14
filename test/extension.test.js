'use strict';

const {describe, test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const IDENTIFIER = 'com.andrunio.SanctumCsrfTokenForLaravel';
const FILE_NAME = `${IDENTIFIER.split('.').pop()}.js`;

const source = fs.readFileSync(path.join(ROOT, FILE_NAME), 'utf8');

// Runs the shipped script the way the host does; the filename makes coverage see the file.
const loadDynamicValueClass = function () {
    let registered = null;

    globalThis.registerDynamicValueClass = function (klass) {
        registered = klass;
    };

    globalThis.DynamicValueInput = function (key, name, type, options) {
        return {key, name, type, options: options || {}};
    };

    vm.runInThisContext(source, {filename: path.join(ROOT, FILE_NAME)});

    return registered;
};

const CURRENT_REQUEST_ID = 'current-request-id';

// Context stub for the default mode: the extension reads the Cookie header only.
const contextWithCookieHeader = function (header) {
    return {
        getCurrentRequest: function () {
            return {
                id: CURRENT_REQUEST_ID,
                getHeaderByName: function (name) {
                    return name === 'Cookie' ? header : null;
                },
            };
        },
    };
};

// Stands in for the request object the host hands over through the picker.
const pickedRequest = function (setCookie, id) {
    return {
        id: id === undefined ? 'source-request-id' : id,
        getLastExchange: function () {
            if (setCookie === undefined) {
                return null;
            }

            return {
                getResponseHeaderByName: function (header) {
                    return header === 'Set-Cookie' ? setCookie : null;
                },
            };
        },
    };
};

const DynamicValue = loadDynamicValueClass();

describe('evaluate from the Cookie header', function () {
    const cases = [
        ['plain token', 'XSRF-TOKEN=abc123', 'abc123'],
        ['url-encoded value', 'laravel_session=zzz; XSRF-TOKEN=eyJpdiI6%22aa%2Fbb%3D%3D%22', 'eyJpdiI6"aa/bb=="'],
        ['base64 padding inside the value', 'XSRF-TOKEN=eyJpdiI6ImFhIn0==', 'eyJpdiI6ImFhIn0=='],
        ['cookie is neither first nor tightly spaced', ' foo=1;  XSRF-TOKEN = tok ; bar=2', 'tok'],
        ['valueless entry in the cookie list', 'HttpOnly; XSRF-TOKEN=tok', 'tok'],
        ['no Cookie header at all', null, ''],
        ['cookie absent from the header', 'laravel_session=zzz', ''],
        ['empty header', '', ''],
    ];

    for (const [name, header, expected] of cases) {
        test(name, function () {
            const dynamicValue = new DynamicValue();

            assert.equal(dynamicValue.evaluate(contextWithCookieHeader(header)), expected);
        });
    }

    test('is what a dynamic value saved before the input existed reads', function () {
        const dynamicValue = new DynamicValue();

        assert.equal(dynamicValue.sourceRequest, undefined);
        assert.equal(dynamicValue.evaluate(contextWithCookieHeader('XSRF-TOKEN=tok')), 'tok');
    });

    test('is what the picker reads while it sits on Current Request', function () {
        const dynamicValue = new DynamicValue();

        // Current Request hands back the very object getCurrentRequest() returns.
        dynamicValue.sourceRequest = pickedRequest('XSRF-TOKEN=from-exchange', CURRENT_REQUEST_ID);

        assert.equal(dynamicValue.evaluate(contextWithCookieHeader('XSRF-TOKEN=tok')), 'tok');
    });
});

describe('evaluate from the last exchange of a source request', function () {
    const evaluateExchange = function (setCookie) {
        const dynamicValue = new DynamicValue();

        dynamicValue.sourceRequest = pickedRequest(setCookie);

        return dynamicValue.evaluate(contextWithCookieHeader('XSRF-TOKEN=from-cookie'));
    };

    const cases = [
        ['single cookie with attributes', 'XSRF-TOKEN=abc123; expires=Wed, 09 Jun 2021 10:18:14 GMT; path=/', 'abc123'],
        ['cookies stacked behind a comma', 'laravel_session=zzz; path=/, XSRF-TOKEN=tok; path=/', 'tok'],
        ['token first, session second', 'XSRF-TOKEN=tok; path=/, laravel_session=zzz; path=/', 'tok'],
        ['url-encoded value', 'XSRF-TOKEN=eyJpdiI6%22aa%2Fbb%3D%3D%22; path=/', 'eyJpdiI6"aa/bb=="'],
        ['name is only a suffix of another cookie', 'MY-XSRF-TOKEN=nope, XSRF-TOKEN=yes', 'yes'],
        ['cookie absent from the header', 'laravel_session=zzz; path=/', ''],
        ['no Set-Cookie in the response', null, ''],
        ['empty Set-Cookie', '', ''],
        ['source request has never been sent', undefined, ''],
    ];

    for (const [name, setCookie, expected] of cases) {
        test(name, function () {
            assert.equal(evaluateExchange(setCookie), expected);
        });
    }

    test('wins over the Cookie header of the current request', function () {
        const dynamicValue = new DynamicValue();

        dynamicValue.sourceRequest = pickedRequest('XSRF-TOKEN=from-exchange; path=/');

        assert.equal(dynamicValue.evaluate(contextWithCookieHeader('XSRF-TOKEN=from-cookie')), 'from-exchange');
    });
});

describe('host contract', function () {
    test('registers exactly one class', function () {
        assert.equal(typeof DynamicValue, 'function');
    });

    test('carries the required static fields', function () {
        assert.equal(DynamicValue.identifier, IDENTIFIER);
        assert.equal(typeof DynamicValue.title, 'string');
        assert.ok(DynamicValue.title.length > 0);
    });

    test('is installed under the file name the identifier dictates', function () {
        assert.equal(path.basename(FILE_NAME), `${DynamicValue.identifier.split('.').pop()}.js`);
    });

    test('implements evaluate, title and text', function () {
        const dynamicValue = new DynamicValue();

        for (const method of ['evaluate', 'title', 'text']) {
            assert.equal(typeof dynamicValue[method], 'function', `${method} is missing`);
        }

        assert.ok(dynamicValue.title(contextWithCookieHeader(null)).length > 0);
        assert.ok(dynamicValue.text(contextWithCookieHeader(null)).length > 0);
    });

    test('declares the request picker as its only input', function () {
        assert.equal(DynamicValue.inputs.length, 1);

        const [sourceRequest] = DynamicValue.inputs;

        assert.equal(sourceRequest.key, 'sourceRequest');
        assert.equal(sourceRequest.type, 'Request');
    });

    test('stays a plain script with no debug output', function () {
        assert.ok(!/\bconsole\s*\./.test(source), 'console call left in the shipped file');
        assert.ok(!/^\s*(?:import|export)\b/m.test(source), 'import/export is not supported by the host');
        assert.ok(!/\brequire\s*\(/.test(source), 'Node.js API is not available in the host');
    });
});
