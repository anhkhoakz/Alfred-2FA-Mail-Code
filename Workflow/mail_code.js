#!/usr/bin/osascript -l JavaScript

function run(argv) {
    // Access the Mail application
    const Mail = Application('Mail');
    Mail.includeStandardAdditions = true;

    // Get the mailboxes
    const junkMailbox = Mail.junkMailbox;
    const inboxMailbox = Mail.inbox;
    
    // Retrieve messages from each mailbox (if available)
    const junkMessages = junkMailbox ? junkMailbox.messages() : [];
    const inboxMessages = inboxMailbox ? inboxMailbox.messages() : [];

    // Return empty result if both mailboxes are empty
    if (junkMessages.length === 0 && inboxMessages.length === 0) {
        return JSON.stringify({ items: [] });
    }

    // Utility function to strip HTML tags
    function stripHtmlTags(html) {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Utility function to truncate text for subtitle
    function truncateText(text, maxLength = 100) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    // Extract 2FA code from message content (ported from Messages workflow)
    function extractCaptchaFromContent(content) {
        // Remove HTML tags first
        const cleanedContent = stripHtmlTags(content);
        
        // Remove date strings in various formats
        const cleanedMsg = cleanedContent.replace(
            /\d{4}[./-]\d{1,2}[./-]\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g,
            ''
        );

        // Match numbers with 3 to 7 digits, not part of currency amounts
        const regex = /\b(?<![.,]\d|€|\$|£)(\d{3,7})(?!\d|[.,]\d|€|\$|£)\b/g;

        // Collect all matches
        const matches = [];
        let match;
        while ((match = regex.exec(cleanedMsg)) !== null) {
            matches.push(match[0]);
        }

        // Sort by length in descending order (longer codes first)
        matches.sort((a, b) => b.length - a.length);

        // Return the first (longest) match, or null if no matches found
        return matches.length > 0 ? matches[0] : null;
    }

    // Process messages and extract 2FA codes
    const items = [];
    const processedMessages = new Set(); // To avoid duplicates

    // Helper function to process messages from a mailbox
    function processMessages(messages, maxCount = 5) {
        const messagesToProcess = messages.slice(0, maxCount);
        
        for (const message of messagesToProcess) {
            try {
                const messageId = message.id();
                
                // Skip if already processed
                if (processedMessages.has(messageId)) {
                    continue;
                }
                processedMessages.add(messageId);

                const subject = message.subject() || 'No Subject';
                const content = message.content();
                const htmlContent = content ? content.toString() : '';
                
                // Extract 2FA code
                const captchaCode = extractCaptchaFromContent(htmlContent);
                
                if (captchaCode) {
                    const cleanText = stripHtmlTags(htmlContent);
                    items.push({
                        title: `${subject}, Code: ${captchaCode}`,
                        subtitle: truncateText(cleanText),
                        arg: captchaCode,
                        uid: messageId,
                        variables: {
                            messageId: messageId.toString()
                        },
                        text: {
                            copy: captchaCode,
                            largetype: cleanText
                        }
                    });
                }
            } catch (error) {
                // Skip messages that can't be processed
                continue;
            }
        }
    }

    // Process messages from both mailboxes
    processMessages(inboxMessages, 5);
    processMessages(junkMessages, 5);

    // Sort items by title (most recent subjects tend to be processed first)
    items.sort((a, b) => a.title.localeCompare(b.title));

    // Return Alfred script filter JSON format
    return JSON.stringify({ items: items });
}