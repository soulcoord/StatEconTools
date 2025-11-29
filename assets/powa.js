
        const ROWS_PER_PAGE = 10;
        let currentPage = 1;
        let poissonData = [];
        let selectedK = null;
        const elements = {
            lambdaInput: document.getElementById('lambdaInput'),
            generateBtn: document.getElementById('generateBtn'),
            quickGenerate: document.getElementById('quickGenerate'),
            alert: document.getElementById('alert'),
            alertText: document.getElementById('alertText'),
            statsCard: document.getElementById('statsCard'),
            dataCard: document.getElementById('dataCard'),
            tableBody: document.getElementById('tableBody'),
            pagination: document.getElementById('pagination'),
            loading: document.getElementById('loading'),
            meanValue: document.getElementById('meanValue'),
            varianceValue: document.getElementById('varianceValue'),
            stdDevValue: document.getElementById('stdDevValue'),
            totalProbValue: document.getElementById('totalProbValue'),
            barContainer: document.getElementById('barContainer')
        };

        const factorialCache = { 0: 1, 1: 1 };

        function factorial(n) {
            if (factorialCache[n] !== undefined) return factorialCache[n];
            factorialCache[n] = n * factorial(n - 1);
            return factorialCache[n];
        }

        function poissonProbability(lambda, k) {
            return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
        }

        function generatePoissonData(lambda) {
            const data = [];
            const maxK = Math.max(30, Math.ceil(lambda + 6 * Math.sqrt(lambda)));
            let cumulative = 0;

            for (let k = 0; k <= maxK; k++) {
                const probability = poissonProbability(lambda, k);
                cumulative += probability;

                data.push({
                    k,
                    probability,
                    cumulative,
                    probStr: probability.toFixed(6),
                    cumStr: cumulative.toFixed(6)
                });

                if (cumulative > 0.99999) break;
            }

            return data;
        }

        function updateStatistics(lambda) {
            const total = poissonData.reduce((sum, item) => sum + item.probability, 0);

            elements.meanValue.textContent = lambda.toFixed(4);
            elements.varianceValue.textContent = lambda.toFixed(4);
            elements.stdDevValue.textContent = Math.sqrt(lambda).toFixed(4);
            elements.totalProbValue.textContent = total.toFixed(4);

            elements.statsCard.style.display = 'block';
        }

        function renderTable() {
            const start = (currentPage - 1) * ROWS_PER_PAGE;
            const end = start + ROWS_PER_PAGE;
            const pageData = poissonData.slice(start, end);

            elements.tableBody.innerHTML = '';

            pageData.forEach(item => {
                const row = document.createElement('tr');
                if (item.k === selectedK) {
                    row.classList.add('highlighted');
                }

                row.innerHTML = `
                    <td>${item.k}</td>
                    <td>${item.probStr}</td>
                    <td>${item.cumStr}</td>
                `;

                row.addEventListener('click', () => {
                    selectedK = item.k;
                    renderTable();
                    highlightChartBar(item.k);
                });

                elements.tableBody.appendChild(row);
            });
        }

        function renderPagination() {
            const totalPages = Math.ceil(poissonData.length / ROWS_PER_PAGE);
            elements.pagination.innerHTML = '';

            const prevBtn = document.createElement('button');
            prevBtn.innerHTML = '←';
            prevBtn.disabled = currentPage === 1;
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable();
                    renderPagination();
                }
            });
            elements.pagination.appendChild(prevBtn);

            const maxVisible = 5;
            let startPage = Math.max(1, currentPage - 2);
            let endPage = Math.min(totalPages, startPage + maxVisible - 1);

            if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.textContent = i;
                if (i === currentPage) {
                    pageBtn.classList.add('active');
                }
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    renderTable();
                    renderPagination();
                });
                elements.pagination.appendChild(pageBtn);
            }

            const nextBtn = document.createElement('button');
            nextBtn.innerHTML = '→';
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.addEventListener('click', () => {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderTable();
                    renderPagination();
                }
            });
            elements.pagination.appendChild(nextBtn);
        }

        function renderChart() {
            elements.barContainer.innerHTML = '';

            const maxProb = Math.max(...poissonData.map(item => item.probability));

            poissonData.forEach(item => {
                const barHeight = (item.probability / maxProb) * 100;

                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.id = `bar-${item.k}`;
                bar.style.height = `${barHeight}%`;

                if (item.k === selectedK) {
                    bar.classList.add('highlighted');
                }

                const tooltip = document.createElement('div');
                tooltip.className = 'bar-tooltip';
                tooltip.innerHTML = `k=${item.k}<br>P=${item.probStr}`;
                bar.appendChild(tooltip);

bar.addEventListener('click', () => {
    selectedK = item.k;
    highlightChartBar(item.k);

    const index = poissonData.findIndex(d => d.k === item.k);
    const page = Math.floor(index / ROWS_PER_PAGE) + 1;
    if (page !== currentPage) {
        currentPage = page;
        renderPagination();
    }
    renderTable();

    openTab('table');
});

                elements.barContainer.appendChild(bar);
            });
        }

        function highlightChartBar(k) {
            document.querySelectorAll('.chart-bar').forEach(bar => {
                bar.classList.remove('highlighted');
            });

            const bar = document.getElementById(`bar-${k}`);
            if (bar) {
                bar.classList.add('highlighted');
            }
        }

        function generateDistribution() {
            const lambda = parseFloat(elements.lambdaInput.value);

            if (isNaN(lambda) || lambda <= 0) {
                showAlert('請輸入有效的 λ 值（必須大於 0）', 'danger');
                return;
            }

            showLoading(true);
            selectedK = null;

            setTimeout(() => {
                poissonData = generatePoissonData(lambda);
                currentPage = 1;

                updateStatistics(lambda);
                renderTable();
                renderPagination();
                renderChart();

                elements.dataCard.style.display = 'block';
                showLoading(false);
                showAlert(`成功生成 λ = ${lambda} 的普瓦松分配表`, 'success');
            }, 250);
        }

        function showAlert(message, type = 'danger') {
            elements.alertText.textContent = message;
            elements.alert.className = `alert alert--${type} show`;
            setTimeout(() => {
                elements.alert.classList.remove('show');
            }, 3200);
        }

        function showLoading(show) {
            elements.loading.classList.toggle('show', show);
        }

        function openTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            document.getElementById(tabName).classList.add('active');
            document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

            if (tabName === 'chart' && poissonData.length > 0) {
                setTimeout(() => renderChart(), 100);
            }
        }

        function handleGenerate() {
            generateDistribution();
        }

        elements.generateBtn.addEventListener('click', handleGenerate);
        elements.quickGenerate.addEventListener('click', handleGenerate);

        elements.lambdaInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateDistribution();
            }
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                openTab(btn.dataset.tab);
            });
        });

        window.addEventListener('load', () => {
            generateDistribution();
        });

        window.addEventListener('resize', () => {
            if (document.getElementById('chart').classList.contains('active') && poissonData.length > 0) {
                renderChart();
            }
        });
