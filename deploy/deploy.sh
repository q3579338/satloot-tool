#!/usr/bin/env bash
# tool.satloot.com 一键发布（在本机跑，走 SSH 推到 VPS）。
#
# 用法：
#   bash deploy/deploy.sh
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
SRC="$HERE/index.html"
CONF="$HERE/deploy/nginx-$DOMAIN.conf"

[ -f "$SRC" ]  || { echo "!! 找不到 $SRC"; exit 1; }
[ -f "$CONF" ] || { echo "!! 找不到 $CONF"; exit 1; }

SSH=(ssh -i "$KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$HOST")

echo "==> 建站点目录"
"${SSH[@]}" "mkdir -p $WEBROOT"

echo "==> 推 index.html（$(wc -c < "$SRC") 字节）"
scp -i "$KEY" -o StrictHostKeyChecking=accept-new -q "$SRC" "$HOST:$WEBROOT/index.html"

echo "==> 推 nginx 站点配置"
scp -i "$KEY" -o StrictHostKeyChecking=accept-new -q "$CONF" "$HOST:/etc/nginx/sites-available/$DOMAIN"

echo "==> 启用站点 + 校验配置"
"${SSH[@]}" "set -e
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
"${SSH[@]}" "curl -s -o /dev/null -w '   源站 HTTP %{http_code}\n' -H 'Host: $DOMAIN' http://127.0.0.1/"

echo
echo "完成：http://$DOMAIN/"
echo "（发布前该域名会 301 到 bnbbang.com——那是 nginx 没有匹配的 server_name 时"
echo "  落到首个 server 块的结果，不是 Cloudflare 规则。装上本站点块后即自动消失。）"
