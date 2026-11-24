#!/usr/bin/env bash
# Varredura de N do lote (medicao-gotenberg.md, seção "Lote"). Da raiz da lane, com o stack de pé:
#   bash docs/superpowers/blocos/62-certificacao-paineis-lote-e-planilha/medir-lote.sh
# Variáveis: RODADAS=3 CERTS=30 MIX=misto NS="1 2 3 4 6" SERIE=1.
# Intercala os braços (cada rodada percorre a série e todos os N), porque o ruído desta máquina é
# maior que a diferença entre braços. Por execução: tempo total, pico de memória do container
# (docker stats a cada ~1 s, líquida de cache de página; mais a memória de ANTES da execução, porque o
# Chromium acumula até o restart das 100 conversões e o ponto do ciclo muda de execução para execução) e, depois, RestartCount / OOMKilled /
# oom_kill do cgroup.
set -u
RODADAS=${RODADAS:-3}; CERTS=${CERTS:-30}; MIX=${MIX:-misto}; NS=${NS:-"1 2 3 4 6"}; SERIE=${SERIE:-1}
DIR="$(cd "$(dirname "$0")" && pwd)"
G=$(docker compose ps -q gotenberg)
oom() { docker exec "$G" sh -c "grep oom_kill /sys/fs/cgroup/memory.events" | awk '{print $2}'; }
estado() { docker inspect "$G" --format 'restarts={{.RestartCount}} oomkilled={{.State.OOMKilled}}'; }
echo "inicio: $(estado) oom_kill=$(oom) certs=$CERTS mix=$MIX rodadas=$RODADAS"
rodar() { # modo conc
  local f; f=$(mktemp)
  local antes; antes=$(docker stats --no-stream --format '{{.MemUsage}}' "$G" | awk '{u=$1; v=u+0; if (u ~ /GiB/) v*=1024; print v}')
  ( while true; do docker stats --no-stream --format '{{.MemUsage}}' "$G" | awk '{u=$1; v=u+0; if (u ~ /GiB/) v*=1024; print v}' >> "$f"; done ) &
  local s=$!
  local linha; linha=$(docker compose exec -T -e MODO="$1" -e CONC="$2" -e CERTS="$CERTS" -e MIX="$MIX" app php < "$DIR/medir-lote.php" 2>&1 | tail -1)
  kill $s 2>/dev/null; wait $s 2>/dev/null
  local pico; pico=$(sort -n "$f" | tail -1); rm -f "$f"
  echo "$linha antes_mib=$antes pico_mib=$pico $(estado) oom_kill=$(oom)"
}
# aquecimento: o Chromium frio custa ~1 s uma vez
docker compose exec -T -e MODO=serie -e CERTS=2 app php < "$DIR/medir-lote.php" >/dev/null 2>&1
for r in $(seq 1 "$RODADAS"); do
  echo "--- rodada $r"
  [ "$SERIE" = 1 ] && rodar serie 1
  for n in $NS; do rodar lote "$n"; done
done
echo "fim: $(estado) oom_kill=$(oom)"
