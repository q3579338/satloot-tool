#!/usr/bin/env bash
# tool.satloot.com 一键发布（在本机跑，走 SSH 推到 VPS）。
#
# 用法：
#   bash deploy/deploy.sh
#
# 先 node tools/build.mjs 生成 dist/（中文 index.html + 英文 en/index.html + sitemap.xml + robots.txt），
# 再把 dist/ 整目录推到站点 root（deploy/nginx-tool.satloot.com.conf 里的 root），nginx 配置不动 root。
#
# 共存原则（VPS 上还跑着 bnbbang / earnfarm / faucet）：
# - 只新增 tool.satloot.com 的站点文件和 /var/www/satloot-tool 目录，
#   绝不改动、绝不覆盖任何既有站点配置；
# - reload 之前先 nginx -t，没过就原样退出，不碰正在服务的 nginx。
set -euo pipefail

# 部署目标不写进仓库（站点套着 Cloudflare，源站 IP 不公开）：export HOST=user@host，或写在 ~/.earnfarm-deploy/host.txt
HOST="${HOST:-$(cat "$HOME/.earnfarm-deploy/host.txt" 2>/dev/null || true)}"
[ -n "$HOST" ] || { echo "!! 未设置部署目标：export HOST=user@host 或写入 ~/.earnfarm-deploy/host.txt"; exit 1; }
KEY="${KEY:-$HOME/.earnfarm-deploy/earnfarm_deploy_key}"
DOMAIN=tool.satloot.com
WEBROOT=/var/www/satloot-tool

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$HERE/dist"
CONF="$HERE/deploy/nginx-$DOMAIN.conf"

[ -f "$CONF" ] || { echo "!! 找不到 $CONF"; exit 1; }

echo "==> 构建 dist/（node tools/build.mjs）"
node "$HERE/tools/build.mjs"
[ -f "$DIST/index.html" ] && [ -f "$DIST/en/index.html" ] && [ -f "$DIST/sitemap.xml" ] \
    || { echo "!! dist/ 不完整，构建失败？"; exit 1; }

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$HOST")
SCP=(scp -i "$KEY" -o StrictHostKeyChecking=accept-new -q)

TGZ="$(mktemp -t satloot-tool.XXXXXX.tgz)"
trap 'rm -f "$TGZ"' EXIT
tar czf "$TGZ" -C "$DIST" .
echo "==> 推 dist/ 整目录（$(wc -c < "$TGZ") 字节打包）"
"${SCP[@]}" "$TGZ" "$HOST:/tmp/satloot-tool.tgz"

echo "==> 推 nginx 站点配置"
"${SCP[@]}" "$CONF" "$HOST:/etc/nginx/sites-available/$DOMAIN"

echo "==> 解包到 $WEBROOT + 启用站点 + 校验配置"
"${SSH[@]}" "set -e
    mkdir -p $WEBROOT
    tar xzf /tmp/satloot-tool.tgz -C $WEBROOT
    rm -f /tmp/satloot-tool.tgz
    ln -sfn /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
    chown -R www-data:www-data $WEBROOT 2>/dev/null || true
    chmod -R a+rX $WEBROOT
    if nginx -t; then
        systemctl reload nginx
        echo '   nginx 已 reload'
    else
        # 配置没过就把软链摘掉，别让坏配置留在 enabled 里
        rm -f /etc/nginx/sites-enabled/$DOMAIN
        echo '!! nginx -t 未通过，已撤销软链，nginx 未 reload'
        exit 1
    fi"

echo "==> 回源自检（绕过 Cloudflare，直连源站）"
"${SSH[@]}" "for p in / /en/ /sitemap.xml; do curl -s -o /dev/null -w \"   源站 \$p HTTP %{http_code}\n\" -H 'Host: $DOMAIN' http://127.0.0.1\$p; done"

echo
echo "完成：https://$DOMAIN/  与  https://$DOMAIN/en/"
