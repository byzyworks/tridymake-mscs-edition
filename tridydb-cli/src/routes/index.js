import express from 'express';

import { interpreter } from '../include/interpreter.js';

const toTridy = (op, opts = { }) => {
    let cmd = '';

    if (opts.context) {
        cmd += `@in ${opts.context} `;
    }

    cmd += `@${op}`;

    if (opts.define.sys) {
        cmd += ` ${sys}`;
    }

    if (opts.define.as) {
        cmd += ` @as ${opts.define.as}`;
    }

    if (opts.define.is) {
        cmd += ` @is ${opts.define.is}`;
    }

    if (opts.define.has) {
        cmd += ` @has ${opts.define.has}`;
    }

    cmd += ';';

    return cmd;
}

export const routes = express.Router();

routes.get('/:context', async (req, res) => {
    const opts = { context: req.params.context };
    const cmd = toTridy('get', opts);

    const out = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.post('/:context/:sys', async (req, res) => {
    const opts = {
        context: req.params.context,
        define: {
            sys: req.params.sys,
            tags: req.query.as,
            heap: req.query.is,
            stack: req.query.has
        }
    };
    const cmd = toTridy('new', opts);
    
    const out = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.post('/:sys', async (req, res) => {
    const opts = { define: { sys: req.params.sys } };
    const cmd = toTridy('new', opts);

    const out = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.put('/:context/:sys', async (req, res) => {
    const opts = {
        context: req.params.context,
        define: {
            sys: req.params.sys,
            tags: req.query.as,
            heap: req.query.is,
            stack: req.query.has
        }
    };
    const cmd = toTridy('set', opts);

    const out = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.put('/:sys', async (req, res) => {
    const opts = { define: { sys: req.params.sys } };
    const cmd = toTridy('set', opts);

    const out = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.delete('/:context', async (req, res) => {
    const opts = { context: req.params.context };
    const cmd = toTridy('del', opts);

    const out = await interpreter.parse(cmd, { accept_carry: false });

    res.json(out);
});
