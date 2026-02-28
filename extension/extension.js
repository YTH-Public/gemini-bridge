const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

/** @type {vscode.StatusBarItem} */
let statusBarItem;
/** @type {vscode.FileSystemWatcher} */
let watcher;
/** @type {vscode.FileSystemWatcher} */
let bridgeDirWatcher;
/** @type {boolean} */
let processing = false;
/** @type {NodeJS.Timeout|null} */
let autoApproveTimer = null;
/** 자동 승인 폴링 지속 시간 (ms) */
const AUTO_APPROVE_DURATION = 120000;
/** 자동 승인 폴링 간격 (ms) */
const AUTO_APPROVE_INTERVAL = 2000;

/**
 * bridge/from-claude/ 디렉토리 경로를 찾는다.
 */
function findBridgeDir() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return null;

    for (const folder of folders) {
        const candidate = path.join(folder.uri.fsPath, 'bridge', 'from-claude');
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}

/**
 * 트리거 파일을 처리하여 Gemini Agent 채팅에 메시지를 전송한다.
 * @param {vscode.Uri} uri
 */
async function handleTriggerFile(uri) {
    if (processing) return;
    processing = true;

    try {
        const filePath = uri.fsPath;

        // .trigger 파일만 처리
        if (!filePath.endsWith('.trigger')) return;

        // 파일 내용 읽기
        const content = fs.readFileSync(filePath, 'utf-8').trim();
        if (!content) {
            vscode.window.showWarningMessage('Claude Bridge: 빈 트리거 파일 무시됨');
            return;
        }

        updateStatus('$(sync~spin) Sending...');

        // 직접 Agent Panel에 프롬프트 전송
        try {
            await vscode.commands.executeCommand('antigravity.sendPromptToAgentPanel', content);
        } catch (e) {
            await vscode.commands.executeCommand('antigravity.sendTextToChat', content);
        }

        // 자동 승인 폴링 시작 (Gemini의 파일 접근 권한 요청을 자동 승인)
        startAutoApprove();

        // 트리거 파일 삭제
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            // 이미 삭제된 경우 무시
        }

        updateStatus('$(check) Sent');
        vscode.window.showInformationMessage(
            `Claude Bridge: 메시지 전송 완료 (${content.length}자)`
        );

        // 2초 후 상태 복원
        setTimeout(() => updateStatus('$(plug) Claude Bridge'), 2000);

    } catch (err) {
        vscode.window.showErrorMessage(`Claude Bridge 오류: ${err.message}`);
        updateStatus('$(error) Error');
        setTimeout(() => updateStatus('$(plug) Claude Bridge'), 3000);
    } finally {
        processing = false;
    }
}

/**
 * 수동 명령어: 입력 다이얼로그로 메시지를 받아 Gemini에 전송
 */
async function sendMessageCommand() {
    const message = await vscode.window.showInputBox({
        prompt: 'Gemini Agent에 보낼 메시지를 입력하세요',
        placeHolder: '메시지 입력...',
    });
    if (!message) return;

    const bridgeDir = findBridgeDir();
    if (!bridgeDir) {
        vscode.window.showErrorMessage(
            'Claude Bridge: bridge/from-claude/ 디렉토리를 찾을 수 없습니다.'
        );
        return;
    }

    const triggerPath = path.join(bridgeDir, `manual-${Date.now()}.trigger`);
    fs.writeFileSync(triggerPath, message, 'utf-8');
}

/**
 * 진단 명령어: Antigravity 관련 사용 가능한 명령어 목록을 출력
 */
async function listCommandsCommand() {
    const allCommands = await vscode.commands.getCommands(true);
    const keywords = ['antigravity', 'cascade', 'chat', 'agent', 'send', 'submit', 'paste', 'mention'];
    const matches = allCommands.filter(cmd => {
        const lower = cmd.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
    });
    matches.sort();

    // 파일로 저장
    const bridgeDir = findBridgeDir();
    const outPath = bridgeDir
        ? path.join(path.dirname(bridgeDir), 'available-commands.txt')
        : '/tmp/antigravity-commands.txt';

    fs.writeFileSync(outPath, matches.join('\n'), 'utf-8');
    vscode.window.showInformationMessage(
        `Claude Bridge: ${matches.length}개 명령어 발견 → ${outPath}`
    );
}

function updateStatus(text) {
    if (statusBarItem) {
        statusBarItem.text = text;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 자동 승인 폴링 시작.
 * Gemini Agent가 파일 접근 권한을 요청할 때 자동으로 acceptAgentStep 실행.
 */
function startAutoApprove() {
    stopAutoApprove();

    let elapsed = 0;
    updateStatus('$(sync~spin) Auto-approving...');

    const approveCommands = [
        'antigravity.agent.acceptAgentStep',
        'antigravity.command.accept',
        'antigravity.terminalCommand.accept',
    ];

    autoApproveTimer = setInterval(async () => {
        elapsed += AUTO_APPROVE_INTERVAL;

        for (const cmd of approveCommands) {
            try {
                await vscode.commands.executeCommand(cmd);
            } catch (e) {
                // 해당 승인 대상이 없으면 무시
            }
        }

        if (elapsed >= AUTO_APPROVE_DURATION) {
            stopAutoApprove();
        }
    }, AUTO_APPROVE_INTERVAL);
}

/**
 * 자동 승인 폴링 중지.
 */
function stopAutoApprove() {
    if (autoApproveTimer) {
        clearInterval(autoApproveTimer);
        autoApproveTimer = null;
        updateStatus('$(plug) Claude Bridge');
    }
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Claude Bridge 익스텐션 활성화됨');

    // 상태바 아이템 생성
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100
    );
    statusBarItem.command = 'claudeBridge.showStatus';
    updateStatus('$(plug) Claude Bridge');
    statusBarItem.tooltip = 'Claude Bridge - Gemini Agent 브릿지 활성';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 명령어 등록
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.sendMessage', sendMessageCommand)
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.showStatus', () => {
            const bridgeDir = findBridgeDir();
            if (bridgeDir) {
                vscode.window.showInformationMessage(
                    `Claude Bridge 활성 | 감시 경로: ${bridgeDir}`
                );
            } else {
                vscode.window.showWarningMessage(
                    'Claude Bridge: bridge/from-claude/ 디렉토리를 찾을 수 없습니다.'
                );
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('claudeBridge.listCommands', listCommandsCommand)
    );

    // bridge/from-claude/ 디렉토리 감시 설정
    setupWatcher(context);

    // 워크스페이스 변경 시 watcher 재설정
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            if (watcher) {
                watcher.dispose();
            }
            setupWatcher(context);
        })
    );
}

/**
 * FileSystemWatcher 설정
 * @param {vscode.ExtensionContext} context
 */
function setupWatcher(context) {
    const bridgeDir = findBridgeDir();
    if (!bridgeDir) {
        console.log('Claude Bridge: bridge/from-claude/ 디렉토리 미발견, 디렉토리 생성 감시 시작...');
        updateStatus('$(plug) Claude Bridge (대기)');
        startBridgeDirWatcher(context);
        return;
    }

    stopBridgeDirWatcher();

    const pattern = new vscode.RelativePattern(bridgeDir, '*.trigger');
    watcher = vscode.workspace.createFileSystemWatcher(pattern);

    watcher.onDidCreate(handleTriggerFile);
    watcher.onDidChange(handleTriggerFile);

    context.subscriptions.push(watcher);

    updateStatus('$(plug) Claude Bridge');
    console.log(`Claude Bridge: 감시 시작 → ${bridgeDir}`);

    // 이미 존재하는 트리거 파일 처리
    const existing = fs.readdirSync(bridgeDir).filter(f => f.endsWith('.trigger'));
    if (existing.length > 0) {
        console.log(`Claude Bridge: 기존 트리거 파일 ${existing.length}개 발견`);
        for (const file of existing) {
            handleTriggerFile(vscode.Uri.file(path.join(bridgeDir, file)));
        }
    }
}

/**
 * bridge/from-claude/ 디렉토리 생성을 감시.
 * /gemini init 후 재시작 없이 자동으로 trigger watcher를 시작한다.
 * @param {vscode.ExtensionContext} context
 */
function startBridgeDirWatcher(context) {
    stopBridgeDirWatcher();

    const folders = vscode.workspace.workspaceFolders;
    if (!folders) return;

    // workspace 내 bridge/from-claude/ 하위에 파일이 생기면 감지
    for (const folder of folders) {
        const pattern = new vscode.RelativePattern(folder, 'bridge/from-claude/*');
        bridgeDirWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        bridgeDirWatcher.onDidCreate((uri) => {
            console.log('Claude Bridge: bridge/from-claude/ 감지됨, watcher 전환');
            stopBridgeDirWatcher();
            setupWatcher(context);
        });

        context.subscriptions.push(bridgeDirWatcher);
    }
}

/**
 * bridge 디렉토리 감시 중지.
 */
function stopBridgeDirWatcher() {
    if (bridgeDirWatcher) {
        bridgeDirWatcher.dispose();
        bridgeDirWatcher = null;
    }
}

function deactivate() {
    if (watcher) {
        watcher.dispose();
    }
    stopBridgeDirWatcher();
    console.log('Claude Bridge 익스텐션 비활성화됨');
}

module.exports = { activate, deactivate };
