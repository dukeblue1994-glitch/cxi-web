name: Run Demo (Netlify Dev + Tests)

on:
workflow_dispatch: {}

concurrency:
group: run-demo-${{ github.ref }}
cancel-in-progress: true

jobs:
dev_and_test:
runs-on: ubuntu-latest
timeout-minutes: 15
steps: - uses: actions/checkout@v4

      - uses: actions/setup-node@v5
        with:
          node-version: "22"
          cache: "npm"

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Start Netlify Dev (background)
        run: |
          NETLIFY_LOG=debug npx netlify dev --dir dist --functions netlify/functions --port 8888 --offline --no-open > netlify-dev.log 2>&1 &
          echo $! > netlify_dev.pid
        env:
          NODE_ENV: test

      - name: Wait for server
        run: |
          set -e
          echo "Waiting for http://localhost:8888 ..."
          deadline=$((SECONDS+240))
          until curl -sf http://localhost:8888/ >/dev/null 2>&1; do
            if [ $SECONDS -gt $deadline ]; then
              echo "Timeout waiting for root.";
              echo "::group::Netlify Dev Log (wait failure root)"; sed -n '1,400p' netlify-dev.log || true; echo "::endgroup::"; exit 1;
            fi
            sleep 2
          done
          echo "Root is up. Waiting for function endpoint..."
          deadline=$((SECONDS+180))
          until curl -sf http://localhost:8888/.netlify/functions/score >/dev/null 2>&1; do
            if [ $SECONDS -gt $deadline ]; then
              echo "Timeout waiting for function endpoint.";
              echo "::group::Netlify Dev Log (wait failure fn)"; sed -n '1,400p' netlify-dev.log || true; echo "::endgroup::"; exit 1;
            fi
            sleep 2
          done
          echo "Function endpoint is up."

      - name: Run tests
        env:
          BASE_URL: http://localhost:8888
        run: |
          node test/test-quality.js
          node test/test-ats.js
          node test/test-reliability.js

      - name: Stop Netlify Dev (always)
        if: always()
        run: |
          if [ -f netlify_dev.pid ]; then kill -9 $(cat netlify_dev.pid) 2>/dev/null || true; fi
          sleep 1
          echo "::group::Netlify Dev Log"
          sed -n '1,200p' netlify-dev.log || true
          echo "::endgroup::"

      - name: Upload logs (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: netlify-dev-log
          path: netlify-dev.log
