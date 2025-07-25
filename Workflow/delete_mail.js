#!/usr/bin/osascript -l JavaScript

function run(argv) {
    // Check if message ID argument is provided
    if (!argv || argv.length === 0) {
        return false;
    }
    
    const messageIdToDelete = parseInt(argv[0]);
    
    // Access the Mail application
    const Mail = Application('Mail');
    Mail.includeStandardAdditions = true;

    try {
        // Get the mailboxes
        const junkMailbox = Mail.junkMailbox;
        const inboxMailbox = Mail.inbox;
        
        // Retrieve messages from each mailbox (if available)
        const junkMessages = junkMailbox ? junkMailbox.messages() : [];
        const inboxMessages = inboxMailbox ? inboxMailbox.messages() : [];

        // Helper function to find and delete message by ID
        function findAndDeleteMessage(messages) {
            for (const message of messages) {
                try {
                    const messageId = message.id();
                    if (messageId === messageIdToDelete) {
                        // Found the message, try to delete it
                        message.delete();
                        return true;
                    }
                } catch (error) {
                    // Skip messages that can't be processed
                    continue;
                }
            }
            return false;
        }

        // Search in inbox first
        if (findAndDeleteMessage(inboxMessages)) {
            return true;
        }

        // If not found in inbox, search in junk
        if (findAndDeleteMessage(junkMessages)) {
            return true;
        }

        // Message not found in either mailbox
        return false;

    } catch (error) {
        // Handle any Mail app access errors or other issues
        return false;
    }
}