import express from 'express';

import { vmdl } from '../controllers/vmdl/VMDL.js';

const toVMDL = (op, opts = { }) => {
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
    const cmd = toVMDL('get', opts);

    const out = await vmdl.parse(cmd, { accept_carry: false });

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
    const cmd = toVMDL('new', opts);
    
    const out = await vmdl.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.post('/:sys', async (req, res) => {
    const opts = { define: { sys: req.params.sys } };
    const cmd = toVMDL('new', opts);

    const out = await vmdl.parse(cmd, { accept_carry: false });

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
    const cmd = toVMDL('now', opts);

    const out = await vmdl.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.put('/:sys', async (req, res) => {
    const opts = { define: { sys: req.params.sys } };
    const cmd = toVMDL('now', opts);

    const out = await vmdl.parse(cmd, { accept_carry: false });

    res.json(out);
});

routes.delete('/:context', async (req, res) => {
    const opts = { context: req.params.context };
    const cmd = toVMDL('done', opts);

    const out = await vmdl.parse(cmd, { accept_carry: false });

    res.json(out);
});
