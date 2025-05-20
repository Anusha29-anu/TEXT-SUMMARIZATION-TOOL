document.addEventListener('DOMContentLoaded', () => {
    const originalTextInput = document.getElementById('originalText');
    const summarizeButton = document.getElementById('summarizeButton');
    const displayedOriginalTextOutput = document.getElementById('displayedOriginalText');
    const summarizedTextOutput = document.getElementById('summarizedText');
    const fileInput = document.getElementById('fileInput');
    const copySummaryButton = document.getElementById('copySummaryButton');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Basic list of English stop words. This could be expanded.
    const STOP_WORDS = new Set([
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't", "as", "at",
        "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't", "cannot", "could",
        "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during", "each", "few", "for", "from",
        "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
        "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've",
        "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
        "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
        "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
        "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they",
        "they'd", "they'll", "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very",
        "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
        "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would", "wouldn't",
        "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves", "p", "br" // common html tags that might appear if text is copied from web
    ]);

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.type === "text/plain") {
                const reader = new FileReader();
                reader.onload = (e) => {
                    originalTextInput.value = e.target.result;
                    // Optionally clear previous summary when new file is loaded
                    // displayedOriginalTextOutput.textContent = "Original text will appear here after summarization.";
                    // summarizedTextOutput.textContent = "Summary will appear here after summarization.";
                    // copySummaryButton.style.display = 'none';
                };
                reader.onerror = () => {
                    alert("Error reading file.");
                    originalTextInput.value = ""; // Clear textarea on error
                };
                reader.readAsText(file);
            } else {
                alert("Please upload a valid .txt file.");
                originalTextInput.value = ""; // Clear textarea if wrong file type
            }
            // Reset file input to allow uploading the same file again if needed
            event.target.value = null;
        }
    });

    summarizeButton.addEventListener('click', () => {
        const text = originalTextInput.value.trim();
        if (!text) {
            alert("Please enter some text or upload a file to summarize.");
            return;
        }

        // Display original text
        displayedOriginalTextOutput.textContent = text;

        // Show loading state
        loadingIndicator.style.display = 'block';
        summarizedTextOutput.textContent = 'Processing summary...';
        summarizedTextOutput.style.color = '#777'; // Style placeholder text
        copySummaryButton.style.display = 'none'; // Hide copy button during processing

        // Use setTimeout to allow UI to update (show loading) before heavy computation
        setTimeout(() => {
            const summary = generateSummary(text);
            summarizedTextOutput.textContent = summary;
            summarizedTextOutput.style.color = '#333'; // Reset to normal text color

            // Determine if a meaningful summary was generated to show the copy button
            const isActualSummary = summary &&
                summary !== "Could not find sentences to summarize." &&
                summary !== text; // Avoid if summary is just the original short text

            if (isActualSummary) {
                copySummaryButton.style.display = 'inline-block';
            } else {
                copySummaryButton.style.display = 'none';
            }

            loadingIndicator.style.display = 'none';
        }, 0); // 0ms delay allows browser to repaint before blocking script
    });

    copySummaryButton.addEventListener('click', () => {
        const summaryText = summarizedTextOutput.textContent;

        // Check if there's actual summary content (not placeholder or error)
        if (summaryText && summaryText !== 'Processing summary...' && summaryText !== 'Your summary will appear here.' && summaryText !== "Could not find sentences to summarize.") {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(summaryText)
                    .then(() => {
                        alert('Summary copied to clipboard!');
                    })
                    .catch(err => {
                        console.error('Failed to copy summary using navigator.clipboard: ', err);
                        // Attempt fallback copy for robustness, e.g. if permissions denied
                        tryManualCopy(summaryText);
                    });
            } else {
                // Fallback for older browsers or environments without navigator.clipboard
                tryManualCopy(summaryText);
            }
        } else {
            alert("No summary available to copy.");
        }
    });

    function tryManualCopy(textToCopy) {
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        // Prevent scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                alert('Summary copied to clipboard! (fallback method)');
            } else {
                alert('Fallback copy command failed. Please copy manually.');
            }
        } catch (err) {
            console.error('Fallback copy method failed: ', err);
            alert('Failed to copy summary. Please try manually.');
        }
        document.body.removeChild(textArea);
    }

    /**
     * Generates a summary of the input text using a simple extractive method.
     * @param {string} text - The text to summarize.
     * @returns {string} - The summarized text.
     */
    function generateSummary(text) {
        // 1. Split text into sentences.
        // This regex handles common sentence endings. More complex sentence tokenization might be needed for edge cases.
        const sentences = text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s/)
            .map(s => s.trim())
            .filter(s => s.length > 0);

        if (sentences.length === 0) return "Could not find sentences to summarize.";
        if (sentences.length <= 2) return text; // If very short, return original

        // 2. Preprocess: Calculate word frequencies in the entire document.
        const wordFrequencies = {};
        const allWords = text.toLowerCase().match(/\b(\w+)\b/g) || []; // Get all words

        allWords.forEach(word => {
            if (!STOP_WORDS.has(word)) {
                wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            }
        });

        // 3. Score sentences.
        const sentenceScores = sentences.map((sentence, index) => {
            const sentenceWords = sentence.toLowerCase().match(/\b(\w+)\b/g) || [];
            let score = 0;
            sentenceWords.forEach(word => {
                if (wordFrequencies[word]) {
                    score += wordFrequencies[word];
                }
            });
            // Add a small bonus for sentences appearing earlier (optional, can be tuned)
            // score -= index * 0.1; // Example: slightly prefer earlier sentences
            return { sentence, score, originalIndex: index };
        });

        // 4. Sort sentences by score in descending order.
        sentenceScores.sort((a, b) => b.score - a.score);

        // 5. Determine number of sentences for summary.
        // Let's aim for about 30% of sentences, with a min of 1 and max of 5.
        let numSummarySentences = Math.max(1, Math.min(5, Math.round(sentences.length * 0.3)));
        if (sentences.length <= 5) numSummarySentences = Math.max(1, Math.min(2, sentences.length - 1)); // for shorter texts

        // 6. Select top N sentences.
        const topSentences = sentenceScores.slice(0, numSummarySentences);

        // 7. Sort these selected sentences back to their original order.
        topSentences.sort((a, b) => a.originalIndex - b.originalIndex);

        // 8. Join sentences to form the summary.
        return topSentences.map(item => item.sentence).join(' ').trim();
    }
});