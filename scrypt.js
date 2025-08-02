document.addEventListener('DOMContentLoaded', () => {
    const fetchButton = document.querySelector('.scryfall__button--fetch');
    const copyButton = document.querySelector('.scryfall__button--copy');
    const decklistTextarea = document.querySelector('.scryfall__textarea');
    const resultsContainer = document.querySelector('.scryfall__results');

    const parseDecklist = (text) => {
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line)
            .map(line => {
                const lineWithoutQuantityMatch = line.match(/(?:^\d+\s*x?\s*)?(.*)/);
                const cardInfo = lineWithoutQuantityMatch ? lineWithoutQuantityMatch[1].trim() : null;

                if (cardInfo) {
                    const parenthesisIndex = cardInfo.indexOf(' (');                   
                    const finalName = (parenthesisIndex > -1)
                        ? cardInfo.substring(0, parenthesisIndex).trim()
                        : cardInfo;

                    return { name: finalName };
                }
                return null;
            });
    };

    const getCardsData = async (identifiers) => {
        const response = await fetch('https://api.scryfall.com/cards/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifiers }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Scryfall API Error:', errorBody);
            throw new Error(`Scryfall API responded with status ${response.status}`);
        }
        
        const result = await response.json();
        return result.data || [];
    };

    const createCardHtml = (card) => {
        const manaCost = card.mana_cost ? `<span class="card__mana-cost">${card.mana_cost}</span>` : '';
        const powerToughness = card.power ? `<p class="card__pt">${card.power}/${card.toughness}</p>` : '';
        const flavorText = card.flavor_text ? `<p class="card__flavor-text">${card.flavor_text}</p>` : '';
        const oracleText = card.oracle_text ? card.oracle_text.split('\n').map(line => `<p>${line}</p>`).join('') : '';

        return `
            <div class="card">
                <p class="card__header">
                    <span class="card__name">${card.name}</span>
                    ${manaCost}
                </p>
                <p class="card__type-line">${card.type_line}</p>
                <div class="card__oracle-text">${oracleText}</div>
                ${flavorText}
                ${powerToughness}
            </div>
        `;
    };

    const renderResults = (cards) => {
        resultsContainer.innerHTML = '';
        if (cards.length > 0) {
            resultsContainer.classList.remove('scryfall__results--empty', 'scryfall__results--error');
            const allCardsHtml = cards.map(createCardHtml).join('');
            resultsContainer.insertAdjacentHTML('beforeend', allCardsHtml);
        } else {
            resultsContainer.classList.add('scryfall__results--empty');
        }
    };

    fetchButton.addEventListener('click', async () => {
        const cardIdentifiers = parseDecklist(decklistTextarea.value);

        if (cardIdentifiers.length === 0) {
            resultsContainer.innerHTML = '';
            resultsContainer.classList.add('scryfall__results--empty');
            return;
        }

        fetchButton.disabled = true;
        resultsContainer.classList.add('scryfall__results--loading');
        resultsContainer.classList.remove('scryfall__results--error', 'scryfall__results--empty');

        try {
            const CHUNK_SIZE = 75;
            const allCardsData = [];
            for (let i = 0; i < cardIdentifiers.length; i += CHUNK_SIZE) {
                const chunk = cardIdentifiers.slice(i, i + CHUNK_SIZE);
                const chunkResult = await getCardsData(chunk);
                allCardsData.push(...chunkResult);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            renderResults(allCardsData);
        } catch (error) {
            console.error('An error occurred during the fetch process:', error);
            resultsContainer.classList.add('scryfall__results--error');
        } finally {
            fetchButton.disabled = false;
            resultsContainer.classList.remove('scryfall__results--loading');
        }
    });

    copyButton.addEventListener('click', async () => {
        if (copyButton.disabled) return;
        const textToCopy = resultsContainer.innerText;
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            copyButton.classList.add('scryfall__button--copied');
            copyButton.disabled = true;
            setTimeout(() => {
                copyButton.classList.remove('scryfall__button--copied');
                copyButton.disabled = false;
            }, 2000);
        } catch (err) {
            console.error('Erreur lors de la copie :', err);
        }
    });
});