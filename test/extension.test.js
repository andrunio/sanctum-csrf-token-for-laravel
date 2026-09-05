'use strict';

const {describe, test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const IDENTIFIER = 'com.a_vasyukov.SanctumCsrfTokenForLaravel';
const FILE_NAME = `${IDENTIFIER.split('.').pop()}.js`;

const source = fs.readFileSync(path.join(ROOT, FILE_NAME), 'utf8');

// Loads the shipped script the way the host does.
const loadDynamicValueClass = function () {
    let registered = null;

    new Function('registerDynamicValueClass', source)(function (klass) {
        registered = klass;
    });

    return registered;
};

// Context stub: the extension reads the Cookie header only.
const contextWithCookieHeader = function (header) {
    return {
        getCurrentRequest: function () {
            return {
                getHeaderByName: function (name) {
                    return name === 'Cookie' ? header : null;
                },
            };
        },
    };
};

const DynamicValue = loadDynamicValueClass();

describe('evaluate', function () {
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

    test('stays a plain script with no debug output', function () {
        assert.ok(!/\bconsole\s*\./.test(source), 'console call left in the shipped file');
        assert.ok(!/^\s*(?:import|export)\b/m.test(source), 'import/export is not supported by the host');
        assert.ok(!/\brequire\s*\(/.test(source), 'Node.js API is not available in the host');
    });
});
