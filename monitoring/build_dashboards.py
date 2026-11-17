#!/usr/bin/env python3
"""Generate the Grigou Grafana dashboards (JSON) in monitoring/dashboards/.

Usage: python3 monitoring/build_dashboards.py
Then copy monitoring/dashboards/*.json to the server in
/opt/monitoring/grafana/provisioning/dashboards/grigou/ (Grafana reloads them
on its own every 30 s).
"""
import json
from pathlib import Path

OUT = Path(__file__).parent / "dashboards"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
_id = 0


def nid():
    global _id
    _id += 1
    return _id


def grid(x, y, w, h):
    return {"x": x, "y": y, "w": w, "h": h}


def row(title, y):
    return {"type": "row", "title": title, "id": nid(), "gridPos": grid(0, y, 24, 1), "collapsed": False, "panels": []}


def ds_var(name, label, typ):
    return {"name": name, "label": label, "type": "datasource", "query": typ, "hide": 0,
            "current": {}, "refresh": 1, "options": []}


# ---------------------------------------------------------------------------
# Dashboard 1: Site traffic (Loki, JSON nginx logs)
# ---------------------------------------------------------------------------
LOKI = {"type": "loki", "uid": "${loki}"}
SEL = '{container="grigou_nginx", stream="stdout"} |= "\\"host\\":"'
HOST = '| host=~"(www\\\\.)?grigou\\\\.fr"'
STATIC = '| uri !~ "/_next/.*|/favicon.*|/api/.*|.*\\\\.(js|css|map|png|jpe?g|gif|svg|ico|webp|woff2?|txt|xml)$"'
BOTS = '(?i).*(bot|crawl|spider|slurp|curl|wget|python|go-http|httpclient|scan|zgrab|masscan|nmap|headless|java/|okhttp|libwww).*'


def q(fields):
    """Logs selector + extraction of the given JSON fields only."""
    return f'{SEL} | json {", ".join(fields)} {HOST}'


def loki_target(expr, legend="", instant=False, ref="A"):
    return {"refId": ref, "datasource": LOKI, "expr": expr, "legendFormat": legend,
            "queryType": "instant" if instant else "range"}


def stat(title, targets, pos, unit="short", decimals=0, thresholds=None, color_mode="value", desc=""):
    steps = thresholds or [{"color": "blue", "value": None}]
    return {"type": "stat", "title": title, "id": nid(), "gridPos": pos, "description": desc,
            "datasource": targets[0]["datasource"], "targets": targets,
            "fieldConfig": {"defaults": {"unit": unit, "decimals": decimals,
                                         "thresholds": {"mode": "absolute", "steps": steps},
                                         "color": {"mode": "thresholds"}}, "overrides": []},
            "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
                        "colorMode": color_mode, "graphMode": "none", "textMode": "value",
                        "justifyMode": "center", "orientation": "auto"}}


def timeseries(title, targets, pos, unit="short", stack=False, interval=None, overrides=None, desc="",
               draw="line", fill=10):
    p = {"type": "timeseries", "title": title, "id": nid(), "gridPos": pos, "description": desc,
         "datasource": targets[0]["datasource"], "targets": targets,
         "fieldConfig": {"defaults": {"unit": unit, "custom": {
             "drawStyle": draw, "lineWidth": 2, "fillOpacity": fill, "showPoints": "never",
             "stacking": {"mode": "normal" if stack else "none", "group": "A"}},
             "color": {"mode": "palette-classic"}}, "overrides": overrides or []},
         "options": {"legend": {"displayMode": "list", "placement": "bottom", "showLegend": True},
                     "tooltip": {"mode": "multi", "sort": "desc"}}}
    if interval:
        p["interval"] = interval
    return p


def bars(title, target, label, pos, unit="short", desc=""):
    return {"type": "bargauge", "title": title, "id": nid(), "gridPos": pos, "description": desc,
            "datasource": target["datasource"], "targets": [target],
            "fieldConfig": {"defaults": {"unit": unit, "displayName": "${__field.labels." + label + "}",
                                         "color": {"mode": "continuous-BlYlRd"},
                                         "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": None}]}},
                            "overrides": []},
            "options": {"orientation": "horizontal", "displayMode": "basic", "showUnfilled": True,
                        "valueMode": "text", "namePlacement": "left", "sizing": "auto",
                        "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}}}


def color_override(name, color):
    return {"matcher": {"id": "byName", "options": name},
            "properties": [{"id": "color", "value": {"mode": "fixed", "fixedColor": color}}]}


def traffic_dashboard():
    R = "[$__range]"
    I = "[$__interval]"
    panels = []
    y = 0
    panels.append(row("Vue d'ensemble (période sélectionnée)", y)); y += 1
    panels += [
        stat("Requêtes", [loki_target(f'sum(count_over_time({q(["host"])} {R}))', instant=True)], grid(0, y, 4, 4),
             desc="Toutes les requêtes HTTP vers grigou.fr (pages, API, fichiers statiques)."),
        stat("Pages vues", [loki_target(f'sum(count_over_time({q(["host", "uri", "status"])} {STATIC} | status < 400 {R}))', instant=True)],
             grid(4, y, 4, 4), desc="Requêtes vers des pages (hors API, fichiers statiques et erreurs)."),
        stat("Visiteurs uniques (IP)", [loki_target(f'count(sum by (remote_addr) (count_over_time({q(["host", "remote_addr", "user_agent"])} | user_agent !~ "{BOTS}" {R})))', instant=True)],
             grid(8, y, 4, 4), desc="Adresses IP distinctes, robots exclus."),
        stat("Erreurs 5xx", [loki_target(f'sum(count_over_time({q(["host", "status"])} | status >= 500 {R})) or vector(0)', instant=True)],
             grid(12, y, 4, 4), thresholds=[{"color": "green", "value": None}, {"color": "orange", "value": 1}, {"color": "red", "value": 20}],
             desc="Erreurs serveur (app ou nginx). Doit rester à 0."),
        stat("Temps de réponse p95", [loki_target(f'quantile_over_time(0.95, {q(["host", "request_time"])} | unwrap request_time {R}) by ()', instant=True)],
             grid(16, y, 4, 4), unit="s", decimals=2,
             thresholds=[{"color": "green", "value": None}, {"color": "orange", "value": 0.5}, {"color": "red", "value": 1.5}],
             desc="95 % des requêtes sont servies plus vite que ça."),
        stat("Part des robots", [loki_target(
            f'100 * sum(count_over_time({q(["host", "user_agent"])} | user_agent =~ "{BOTS}" {R})) / sum(count_over_time({q(["host"])} {R}))', instant=True)],
             grid(20, y, 4, 4), unit="percent", decimals=1, desc="Requêtes venant de robots, crawlers et scanners."),
    ]
    y += 4

    panels.append(row("Activité dans le temps", y)); y += 1
    panels += [
        timeseries("Requêtes par statut HTTP", [loki_target(
            f'sum by (code) (count_over_time({q(["host", "status"])} | label_format code="{{{{ substr 0 1 .status }}}}xx" {I}))', "{{code}}")],
            grid(0, y, 12, 8), stack=True, draw="bars", fill=80,
            overrides=[color_override("2xx", "green"), color_override("3xx", "blue"),
                       color_override("4xx", "orange"), color_override("5xx", "red")]),
        timeseries("Visiteurs uniques et pages vues", [
            loki_target(f'count(sum by (remote_addr) (count_over_time({q(["host", "remote_addr", "user_agent"])} | user_agent !~ "{BOTS}" {I})))', "Visiteurs uniques"),
            loki_target(f'sum(count_over_time({q(["host", "uri", "status"])} {STATIC} | status < 400 {I}))', "Pages vues", ref="B")],
            grid(12, y, 12, 8), interval="1h", desc="Agrégé par heure (ou plus pour les longues périodes)."),
    ]
    y += 8
    panels += [
        timeseries("Temps de réponse", [
            loki_target(f'quantile_over_time(0.50, {q(["host", "request_time"])} | unwrap request_time {I}) by ()', "p50"),
            loki_target(f'quantile_over_time(0.95, {q(["host", "request_time"])} | unwrap request_time {I}) by ()', "p95", ref="B"),
            loki_target(f'quantile_over_time(0.99, {q(["host", "request_time"])} | unwrap request_time {I}) by ()', "p99", ref="C")],
            grid(0, y, 12, 8), unit="s", interval="5m"),
        timeseries("Humains vs robots", [
            loki_target(f'sum(count_over_time({q(["host", "user_agent"])} | user_agent !~ "{BOTS}" {I}))', "Humains"),
            loki_target(f'sum(count_over_time({q(["host", "user_agent"])} | user_agent =~ "{BOTS}" {I}))', "Robots / scanners", ref="B")],
            grid(12, y, 12, 8), stack=True, interval="5m",
            overrides=[color_override("Humains", "green"), color_override("Robots / scanners", "purple")]),
    ]
    y += 8

    panels.append(row("Top (période sélectionnée)", y)); y += 1
    panels += [
        bars("Pages les plus visitées", loki_target(
            f'topk(15, sum by (uri) (count_over_time({q(["host", "uri", "status", "user_agent"])} {STATIC} | status < 400 | user_agent !~ "{BOTS}" {R})))', instant=True),
            "uri", grid(0, y, 8, 10)),
        bars("API les plus appelées", loki_target(
            f'topk(15, sum by (uri) (count_over_time({q(["host", "uri"])} | uri =~ "/api/.*" {R})))', instant=True),
            "uri", grid(8, y, 8, 10)),
        bars("Sources de trafic (sites référents)", loki_target(
            f'topk(15, sum by (referer) (count_over_time({q(["host", "referer"])} | referer != "" | referer !~ ".*grigou\\\\.fr.*" {R})))', instant=True),
            "referer", grid(16, y, 8, 10)),
    ]
    y += 10
    panels += [
        bars("Erreurs 4xx (pages introuvables, scanners)", loki_target(
            f'topk(15, sum by (uri) (count_over_time({q(["host", "uri", "status"])} | status >= 400 | status < 500 {R})))', instant=True),
            "uri", grid(0, y, 8, 10), desc="Beaucoup de /wp-admin, /.env, … = scans automatiques, sans danger."),
        bars("IP les plus actives", loki_target(
            f'topk(15, sum by (remote_addr) (count_over_time({q(["host", "remote_addr"])} {R})))', instant=True),
            "remote_addr", grid(8, y, 8, 10)),
        bars("Pages les plus lentes (p95)", loki_target(
            f'topk(15, quantile_over_time(0.95, {q(["host", "uri", "request_time"])} | uri !~ "/_next/.*" | unwrap request_time {R}) by (uri))', instant=True),
            "uri", grid(16, y, 8, 10), unit="s"),
    ]
    y += 10

    panels.append(row("Journaux", y)); y += 1
    panels += [
        {"type": "logs", "title": "Requêtes en erreur 5xx", "id": nid(), "gridPos": grid(0, y, 12, 10),
         "datasource": LOKI, "targets": [loki_target(f'{q(["host", "status"])} | status >= 500')],
         "options": {"showTime": True, "wrapLogMessage": True, "sortOrder": "Descending", "enableLogDetails": True}},
        {"type": "logs", "title": "Erreurs de l'application (grigou_app)", "id": nid(), "gridPos": grid(12, y, 12, 10),
         "datasource": LOKI, "targets": [loki_target('{container="grigou_app"} |~ "(?i)(error|exception|unhandled|fatal)"')],
         "options": {"showTime": True, "wrapLogMessage": True, "sortOrder": "Descending", "enableLogDetails": True}},
    ]

    return {
        "uid": "grigou-traffic", "title": "Grigou – Trafic du site", "tags": ["grigou", "nginx", "loki"],
        "timezone": "browser", "schemaVersion": 39, "editable": True, "refresh": "1m",
        "time": {"from": "now-24h", "to": "now"},
        "templating": {"list": [ds_var("loki", "Loki", "loki")]},
        "annotations": {"list": []}, "panels": panels,
        "description": "Trafic nginx de grigou.fr (logs JSON collectés par Promtail dans Loki).",
    }


# ---------------------------------------------------------------------------
# Dashboard 2: App activity (PostgreSQL, grafana_ro user)
# ---------------------------------------------------------------------------
PG = {"type": "grafana-postgresql-datasource", "uid": "grigou-pg"}


def sql(raw, fmt="table", ref="A"):
    return {"refId": ref, "datasource": PG, "rawQuery": True, "editorMode": "code", "format": fmt, "rawSql": raw}


def activity_dashboard():
    panels = []
    y = 0
    panels.append(row("Utilisateurs", y)); y += 1
    panels += [
        stat("Utilisateurs inscrits", [sql("SELECT count(*) FROM users")], grid(0, y, 4, 4)),
        stat("Nouveaux inscrits (période)", [sql("SELECT count(*) FROM users WHERE $__timeFilter(created_at)")], grid(4, y, 4, 4),
             thresholds=[{"color": "green", "value": None}]),
        stat("Actifs sur 24 h", [sql("SELECT count(*) FROM users WHERE last_login_at > now() - interval '24 hours'")], grid(8, y, 4, 4)),
        stat("Actifs sur 7 jours", [sql("SELECT count(*) FROM users WHERE last_login_at > now() - interval '7 days'")], grid(12, y, 4, 4)),
        stat("Actifs sur 30 jours", [sql("SELECT count(*) FROM users WHERE last_login_at > now() - interval '30 days'")], grid(16, y, 4, 4)),
        stat("E-mails vérifiés", [sql("SELECT round(100.0 * count(*) FILTER (WHERE email_verified) / nullif(count(*),0), 1) FROM users")],
             grid(20, y, 4, 4), unit="percent", decimals=1),
    ]
    y += 4
    panels += [
        timeseries("Inscriptions par jour", [sql(
            "SELECT $__timeGroupAlias(created_at, '1d', 0), count(*) AS \"Inscriptions\" FROM users "
            "WHERE $__timeFilter(created_at) GROUP BY 1 ORDER BY 1", fmt="time_series")],
            grid(0, y, 12, 8), draw="bars", fill=80),
        timeseries("Connexions par jour", [
            sql("SELECT $__timeGroupAlias(created_at, '1d', 0), count(*) AS \"Connexions\" FROM audit_logs "
                "WHERE action = 'LOGIN_SUCCESS' AND $__timeFilter(created_at) GROUP BY 1 ORDER BY 1", fmt="time_series"),
            sql("SELECT $__timeGroupAlias(created_at, '1d', 0), count(DISTINCT user_id) AS \"Utilisateurs distincts\" FROM audit_logs "
                "WHERE action = 'LOGIN_SUCCESS' AND $__timeFilter(created_at) GROUP BY 1 ORDER BY 1", fmt="time_series", ref="B")],
            grid(12, y, 12, 8), draw="bars", fill=60),
    ]
    y += 8

    panels.append(row("Utilisation", y)); y += 1
    panels += [
        stat("Transactions créées (période)", [sql("SELECT count(*) FROM transactions WHERE $__timeFilter(created_at)")], grid(0, y, 4, 4)),
        stat("Transactions au total", [sql("SELECT count(*) FROM transactions")], grid(4, y, 4, 4)),
        stat("Transactions récurrentes", [sql("SELECT count(*) FROM transactions WHERE is_recurring")], grid(8, y, 4, 4)),
        stat("Portefeuilles actifs", [sql("SELECT count(*) FROM wallets WHERE NOT coalesce(archived, false)")], grid(12, y, 4, 4)),
        stat("Partages de portefeuille acceptés", [sql("SELECT count(*) FROM wallet_shares WHERE accepted_at IS NOT NULL")], grid(16, y, 4, 4)),
        stat("Utilisateurs avec ≥1 transaction", [sql(
            "SELECT count(DISTINCT w.user_id) FROM transactions t JOIN wallets w ON w.id = t.wallet_id")], grid(20, y, 4, 4)),
    ]
    y += 4
    panels += [
        timeseries("Transactions créées par jour", [
            sql("SELECT $__timeGroupAlias(created_at, '1d', 0), "
                "count(*) FILTER (WHERE type = 'income') AS \"Revenus\", "
                "count(*) FILTER (WHERE type = 'outcome') AS \"Dépenses\" "
                "FROM transactions WHERE $__timeFilter(created_at) GROUP BY 1 ORDER BY 1", fmt="time_series")],
            grid(0, y, 12, 8), stack=True, draw="bars", fill=80,
            overrides=[color_override("Revenus", "green"), color_override("Dépenses", "orange")]),
        timeseries("Événements de sécurité par jour", [
            sql("SELECT $__timeGroupAlias(created_at, '1d', 0), action AS metric, count(*) AS value FROM audit_logs "
                "WHERE action <> 'LOGIN_SUCCESS' AND $__timeFilter(created_at) GROUP BY 1, 2 ORDER BY 1", fmt="time_series")],
            grid(12, y, 12, 8), stack=True, draw="bars", fill=80,
            desc="Inscriptions, demandes de réinitialisation de mot de passe, limitations de débit, …"),
    ]

    return {
        "uid": "grigou-activity", "title": "Grigou – Activité de l'application", "tags": ["grigou", "postgres"],
        "timezone": "browser", "schemaVersion": 39, "editable": True, "refresh": "5m",
        "time": {"from": "now-30d", "to": "now"},
        "templating": {"list": []}, "annotations": {"list": []}, "panels": panels,
        "description": "Indicateurs d'usage lus dans la base de prod via l'utilisateur en lecture seule grafana_ro "
                       "(comptages et dates uniquement : ni e-mails, ni montants, ni descriptions).",
    }


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, d in [("grigou-traffic.json", traffic_dashboard()), ("grigou-activity.json", activity_dashboard())]:
        (OUT / name).write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n")
        print("written", OUT / name, len(d["panels"]), "panels")
