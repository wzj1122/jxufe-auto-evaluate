// ==UserScript==
// @name         江西财经大学自动评教
// @namespace    JXUFE-auto-evaluate
// @version      1.0.0
// @description  江西财经大学 KINGOSOFT 教务系统自动评教脚本（每次评教后刷新页面）
// @author       MiMo
// @match        https://jwxt.jxufe.edu.cn/frame/homes.action*
// @icon         https://www.jxufe.edu.cn/statics/jxcjdx/images/favicon.png
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const LOG = '[自动评教]';
    const log = {
        i: (...a) => console.log(LOG, ...a),
        w: (...a) => console.warn(LOG, ...a),
        e: (...a) => console.error(LOG, ...a),
    };

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function frameDoc(id) {
        try { return document.getElementById(id)?.contentDocument || null; }
        catch { return null; }
    }

    function deskDoc() { return frameDoc('frmDesk'); }
    function frame1Doc() { try { return deskDoc()?.getElementById('frame_1')?.contentDocument || null; } catch { return null; } }
    function reportDoc() {
        try {
            const doc = frame1Doc()?.getElementById('frmReport')?.contentDocument;
            if (doc && doc.querySelectorAll("tr[id^='tr']").length > 0) return doc;
            return null;
        } catch { return null; }
    }
    function dialogDoc() { return frameDoc('dialog-frame'); }
    function dialogWin() { try { return document.getElementById('dialog-frame')?.contentWindow || null; } catch { return null; } }

    function showStatus(msg) {
        let el = document.getElementById('ae-status');
        if (!el) {
            el = document.createElement('div');
            el.id = 'ae-status';
            el.style.cssText = 'position:fixed;top:10px;right:10px;background:#667eea;color:#fff;padding:12px 18px;border-radius:8px;z-index:99999;font:14px sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.2)';
            document.body.appendChild(el);
        }
        el.textContent = '📊 ' + msg;
    }

    async function handleNotice() {
        log.i('等待注意事项...');
        await sleep(15000);

        try {
            const f1 = frame1Doc();
            if (!f1) return;
            for (const f of f1.querySelectorAll('iframe, frame')) {
                try {
                    const doc = f.contentDocument;
                    if (!doc) continue;
                    const btn = doc.querySelector('#btnClose') || doc.querySelector('input[type="button"]');
                    if (btn && !btn.disabled) {
                        btn.click();
                        log.i('点击"我已阅读"');
                        await sleep(1000);
                        return;
                    }
                } catch {}
            }
        } catch {}
        log.i('无注意事项按钮，继续');
    }

    function getFirstUnfinishedItem() {
        const doc = reportDoc();
        if (!doc) return null;
        const rows = doc.querySelectorAll("tr[id^='tr']");
        for (const row of rows) {
            const score = doc.querySelector(`#${row.id}_pjdf`);
            if (score?.innerText?.trim()) continue;
            const actions = doc.querySelector(`#${row.id}_wjdc`);
            const btn = Array.from(actions?.querySelectorAll('a') || []).find(a => a.innerText.trim() === '评价');
            if (!btn) continue;
            return {
                id: row.id,
                btn,
                teacher: doc.querySelector(`#${row.id}_js`)?.innerText?.trim() || '未知',
                course: doc.querySelector(`#${row.id}_kc`)?.innerText?.trim() || '未知',
            };
        }
        return null;
    }

    function getUnfinishedCount() {
        const doc = reportDoc();
        if (!doc) return 0;
        let count = 0;
        const rows = doc.querySelectorAll("tr[id^='tr']");
        for (const row of rows) {
            const score = doc.querySelector(`#${row.id}_pjdf`);
            if (!score?.innerText?.trim()) {
                const actions = doc.querySelector(`#${row.id}_wjdc`);
                const btn = Array.from(actions?.querySelectorAll('a') || []).find(a => a.innerText.trim() === '评价');
                if (btn) count++;
            }
        }
        return count;
    }

    async function waitForForm(timeout = 30000) {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            const doc = dialogDoc();
            if (doc) {
                try { const w = dialogWin(); if (w) { w.confirm = () => true; w.alert = () => {}; } } catch {}
                if (doc.querySelector("input[type='radio'][name^='cj']") || doc.querySelector('textarea')) {
                    return doc;
                }
            }
            await sleep(500);
        }
        return null;
    }

    function fillForm(doc) {
        const names = [...new Set(Array.from(doc.querySelectorAll("input[type='radio'][name^='cj']")).map(e => e.name))];
        names.forEach(name => {
            const radios = doc.querySelectorAll(`input[type='radio'][name='${name}']`);
            const best = Array.from(radios).find(r => /_1$/.test(r.id)) || radios[0];
            if (best && !best.checked) { best.click(); best.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        log.i(`选择 ${names.length} 题`);

        let filled = 0;
        doc.querySelectorAll('textarea').forEach(ta => {
            if (!ta.value.trim()) {
                try {
                    const proto = HTMLTextAreaElement.prototype;
                    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
                    desc?.set ? desc.set.call(ta, '很好') : (ta.value = '很好');
                } catch { ta.value = '很好'; }
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                ta.dispatchEvent(new Event('change', { bubbles: true }));
                filled++;
            }
        });
        log.i(`填写 ${filled} 意见框`);
    }

    async function saveAndWait(doc) {
        try { const w = dialogWin(); if (w) { w.confirm = () => true; w.alert = () => {}; } } catch {}

        const btn = doc?.querySelector('#butSub') ||
            Array.from(doc?.querySelectorAll("input[type='button']") || []).find(e => /暂存|保存/.test(e.value));
        if (!btn) { log.w('未找到保存按钮'); return false; }

        btn.click();
        log.i('点击暂存');

        for (let i = 0; i < 10; i++) {
            try { const w = dialogWin(); if (w) { w.confirm = () => true; w.alert = () => {}; } } catch {}
            await sleep(500);
        }

        return true;
    }

    function safeReload() {
        log.i('刷新页面...');
        showStatus('刷新中...');
        window.location.reload();
    }

    async function run() {
        log.i('启动');
        showStatus('启动中...');

        const pending = GM_getValue('pending_eval', false);
        if (pending) {
            log.i('检测到待处理评教，跳过注意事项等待');
            GM_setValue('pending_eval', false);
        }

        if (location.href.includes('cas/login.action') || location.href.includes('login.action')) {
            log.w('检测到登录页面，等待用户重新登录...');
            showStatus('会话过期，请重新登录');
            for (let i = 0; i < 300; i++) {
                if (!location.href.includes('login.action')) {
                    log.i('已重新登录，继续评教');
                    await sleep(3000);
                    break;
                }
                await sleep(1000);
            }
        }

        const alreadyOnEvalPage = !!reportDoc();
        if (alreadyOnEvalPage) {
            log.i('已在评教页面，跳过导航');
        } else {
            log.i('导航到评教页面...');

            for (let i = 0; i < 15; i++) {
                const dd = deskDoc();
                if (dd) break;
                log.i(`等待桌面帧加载... (${i + 1}/15)`);
                await sleep(1000);
            }

            document.querySelector('#header-apps')?.click();
            await sleep(2000);

            for (let i = 0; i < 10; i++) {
                const dd = deskDoc();
                const s9 = dd?.querySelector('#S9');
                if (s9) {
                    s9.click();
                    log.i('点击评教菜单 #S9');
                    break;
                }
                log.i(`等待评教菜单加载... (${i + 1}/10)`);
                await sleep(1000);
            }

            await sleep(5000);

            for (let i = 0; i < 10; i++) {
                if (reportDoc()) break;
                log.i(`等待评教列表加载... (${i + 1}/10)`);
                await sleep(1000);
            }

            if (!reportDoc()) {
                log.w('评教列表加载超时，刷新重试');
                GM_setValue('pending_eval', true);
                await sleep(2000);
                safeReload();
                return;
            }
        }

        if (!pending && !alreadyOnEvalPage) {
            await handleNotice();
        }

        const item = getFirstUnfinishedItem();
        if (!item) {
            log.i('所有评教已完成');
            showStatus('全部完成');
            GM_setValue('pending_eval', false);
            GM_notification({ title: '评教完成', text: '所有评教已处理', timeout: 5000 });
            return;
        }

        const total = getUnfinishedCount();
        log.i(`[1/${total}] ${item.teacher} - ${item.course}`);
        showStatus(`[1/${total}] ${item.course}`);

        item.btn.click();
        await sleep(2000);

        const doc = await waitForForm();
        if (!doc) {
            log.w('表单加载超时，刷新重试');
            GM_setValue('pending_eval', true);
            await sleep(2000);
            safeReload();
            return;
        }

        fillForm(doc);

        const ok = await saveAndWait(doc);
        if (!ok) {
            log.w('保存失败，刷新重试');
            GM_setValue('pending_eval', true);
            await sleep(2000);
            safeReload();
            return;
        }

        log.i(`✓ 完成: ${item.teacher} - ${item.course}`);

        const remaining = total - 1;
        if (remaining > 0) {
            showStatus(`完成，剩余 ${remaining} 项，刷新中...`);
            GM_setValue('pending_eval', true);
            await sleep(3000);
            safeReload();
        } else {
            log.i('全部完成');
            showStatus('全部完成');
            GM_setValue('pending_eval', false);
            GM_notification({ title: '评教完成', text: '所有评教已处理', timeout: 5000 });
        }
    }

    function stop() {
        GM_setValue('pending_eval', false);
        log.i('已停止');
    }

    GM_registerMenuCommand('▶️ 开始评教', run);
    GM_registerMenuCommand('⏹️ 停止', stop);

    if (GM_getValue('pending_eval', false)) {
        log.i('检测到待处理评教，自动继续...');
        run();
    }
})();
