/**
 * Simply Static - Cloudflare + GitHub Settings JavaScript
 */
(function($) {
    'use strict';

    /**
     * Convert domain to project name (example.com → example-com)
     */
    function domainToProjectName(domain) {
        return domain.replace(/\./g, '-').toLowerCase();
    }

    /**
     * Sync R2 account ID from Pages account ID (they share the same account)
     */
    function syncAccountId() {
        var pagesAccountId = $('#cloudflare_pages_account_id').val();
        $('#cloudflare_r2_account_id').val(pagesAccountId);
    }

    /**
     * Update auto-populated fields when domain changes
     */
    function updateAutoPopulatedFields() {
        var domain = $('#destination_host').val();
        var githubUsername = $('#github_username').val();
        
        if (!domain) return;

        // Update CDN Public URL
        var scheme = $('#destination_scheme').val() || 'https://';
        var baseScheme = scheme.replace('www.', ''); // Always use non-www for CDN
        $('#cloudflare_r2_public_url').val(baseScheme + 'cdn.' + domain);

        // Update GitHub Repository
        if (githubUsername) {
            var projectName = domainToProjectName(domain);
            $('#github_repository').val(githubUsername + '/' + projectName);
        }

        // Update Cloudflare Pages Project Name
        var pagesProjectName = domainToProjectName(domain);
        $('#cloudflare_pages_project').val(pagesProjectName);
    }

    $(document).ready(function() {

        // Handle domain selection change
        $('#destination_host').on('change', function() {
            updateAutoPopulatedFields();
        });

        // Handle scheme change
        $('#destination_scheme').on('change', function() {
            updateAutoPopulatedFields();
        });

        // Handle GitHub username change
        $('#github_username').on('input', function() {
            updateAutoPopulatedFields();
        });

        // Sync R2 account ID when Pages account ID changes
        $('#cloudflare_pages_account_id').on('input', function() {
            syncAccountId();
        });

        // Load DNS Zones from Cloudflare
        $('#load-dns-zones').on('click', function() {
            var $button = $(this);
            var $result = $('#dns-zones-result');
            var email = $('#cloudflare_pages_email').val();
            var globalApiKey = $('#cloudflare_pages_global_api_key').val();
            
            if (!email || !globalApiKey) {
                $result.addClass('error').text('Please enter Cloudflare email and Global API Key first.');
                return;
            }
            
            $button.prop('disabled', true);
            $result.removeClass('success error').text('Loading domains...');

            $.ajax({
                url: ssCloudflareGithub.restUrl + 'cloudflare-dns-zones',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: JSON.stringify({
                    email: email,
                    global_api_key: globalApiKey
                }),
                contentType: 'application/json',
                success: function(response) {
                    $button.prop('disabled', false);
                    if (response.success && response.zones && response.zones.length > 0) {
                        var $select = $('#destination_host');
                        var currentValue = $select.val();
                        
                        // Clear and repopulate dropdown
                        $select.empty();
                        $select.append('<option value="">-- Select a domain --</option>');
                        
                        response.zones.forEach(function(zone) {
                            var selected = (zone.name === currentValue) ? ' selected' : '';
                            $select.append('<option value="' + zone.name + '"' + selected + '>' + zone.name + '</option>');
                        });
                        
                        $result.addClass('success').text('Loaded ' + response.zones.length + ' domain(s)');
                        
                        // Trigger update if a domain was already selected
                        if (currentValue) {
                            updateAutoPopulatedFields();
                        }
                    } else {
                        $result.addClass('error').text(response.message || 'No domains found');
                    }
                },
                error: function(xhr) {
                    $button.prop('disabled', false);
                    var message = 'Failed to load domains';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    $result.addClass('error').text(message);
                }
            });
        });

        // Test Cloudflare R2 Connection
        $('#test-r2-connection').on('click', function() {
            var $button = $(this);
            var $result = $('#r2-test-result');
            
            $button.prop('disabled', true);
            $result.removeClass('success error').text(ssCloudflareGithub.testingR2);

            $.ajax({
                url: ssCloudflareGithub.restUrl + 'test-cloudflare-r2',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: JSON.stringify({
                    account_id: $('#cloudflare_pages_account_id').val(),
                    access_key: $('input[name="simply-static[cloudflare_r2_access_key]"]').val(),
                    secret_key: $('input[name="simply-static[cloudflare_r2_secret_key]"]').val(),
                    bucket: $('input[name="simply-static[cloudflare_r2_bucket]"]').val()
                }),
                contentType: 'application/json',
                success: function(response) {
                    $button.prop('disabled', false);
                    if (response.success) {
                        $result.addClass('success').text(response.message);
                    } else {
                        $result.addClass('error').text(response.message);
                    }
                },
                error: function(xhr) {
                    $button.prop('disabled', false);
                    var message = 'Connection failed';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    $result.addClass('error').text(message);
                }
            });
        });

        // Test GitHub Connection
        $('#test-github-connection').on('click', function() {
            var $button = $(this);
            var $result = $('#github-test-result');
            
            $button.prop('disabled', true);
            $result.removeClass('success error').text(ssCloudflareGithub.testingGH);

            $.ajax({
                url: ssCloudflareGithub.restUrl + 'test-github',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: JSON.stringify({
                    token: $('input[name="simply-static[github_token]"]').val(),
                    repository: $('input[name="simply-static[github_repository]"]').val()
                }),
                contentType: 'application/json',
                success: function(response) {
                    $button.prop('disabled', false);
                    if (response.success) {
                        $result.addClass('success').text(response.message);
                    } else {
                        $result.addClass('error').text(response.message);
                    }
                },
                error: function(xhr) {
                    $button.prop('disabled', false);
                    var message = 'Connection failed';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    $result.addClass('error').text(message);
                }
            });
        });

        // Test/Create Cloudflare Pages Project
        $('#test-cf-pages-connection').on('click', function() {
            var $button = $(this);
            var $result = $('#cf-pages-test-result');
            var accountId = $('#cloudflare_pages_account_id').val();
            var email = $('#cloudflare_pages_email').val();
            var globalApiKey = $('#cloudflare_pages_global_api_key').val();
            var projectName = $('#cloudflare_pages_project').val();
            var githubRepo = $('#github_repository').val();
            var githubBranch = $('#github_branch').val() || 'main';
            
            if (!accountId || !email || !globalApiKey || !projectName) {
                $result.addClass('error').text('Please fill in all Cloudflare Pages fields.');
                return;
            }
            
            $button.prop('disabled', true);
            $result.removeClass('success error').text('Checking/creating project...');

            // First try to create/check the project
            $.ajax({
                url: ssCloudflareGithub.restUrl + 'create-cloudflare-pages-project',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: JSON.stringify({
                    account_id: accountId,
                    email: email,
                    global_api_key: globalApiKey,
                    project: projectName,
                    github_repo: githubRepo,
                    github_branch: githubBranch
                }),
                contentType: 'application/json',
                success: function(response) {
                    $button.prop('disabled', false);
                    if (response.success) {
                        $result.addClass('success').text(response.message);
                    } else {
                        $result.addClass('error').text(response.message);
                    }
                },
                error: function(xhr) {
                    $button.prop('disabled', false);
                    var message = 'Connection failed';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        message = xhr.responseJSON.message;
                    }
                    $result.addClass('error').text(message);
                }
            });
        });

        // Copy R2 Account ID to Pages Account ID
        $('input[name="simply-static[cloudflare_r2_account_id]"]').on('input', function() {
            var r2AccountId = $(this).val();
            var pagesAccountId = $('#cloudflare_pages_account_id').val();
            // Only auto-fill if Pages Account ID is empty
            if (!pagesAccountId && r2AccountId) {
                $('#cloudflare_pages_account_id').val(r2AccountId);
            }
        });

        // Run initial update if values exist
        if ($('#destination_host').val()) {
            updateAutoPopulatedFields();
        }

        // ==========================================
        // Deploy Functionality
        // ==========================================
        
        var isDeploying = false;
        var statusPollInterval = null;

        /**
         * Get current timestamp for log
         */
        function getTimestamp() {
            var now = new Date();
            return now.toLocaleTimeString('en-US', { hour12: false });
        }

        /**
         * Add entry to log (newest first - prepend to top)
         */
        function addLogEntry(message, type) {
            type = type || 'info';
            var $log = $('#deploy-log');
            var timestamp = '<span class="ss-cg-log-timestamp">[' + getTimestamp() + ']</span>';
            var entry = '<div class="ss-cg-log-entry ss-cg-log-' + type + '">' + timestamp + message + '</div>';
            $log.prepend(entry);  // Prepend for newest-first
            // Keep scroll at top to see new entries
            $log.scrollTop(0);
        }

        /**
         * Clear log and reset tracking variables
         */
        function clearLog() {
            $('#deploy-log').html('<div class="ss-cg-log-entry ss-cg-log-info">Log cleared. Ready to deploy.</div>');
            // Reset tracking for fresh start
            lastLogId = 0;
            seenMessages = new Set();
            statusCounts = { r2: 0, github: 0, pages: 0, crawl: 0 };
            lastActivityMessages = {};
            lastDebugLine = 0;  // Reset debug file line tracking
        }

        /**
         * Update progress bar
         */
        function updateProgress(percent, statusText) {
            $('#deploy-progress').css('width', percent + '%');
            if (statusText) {
                $('#deploy-status-text').text(statusText);
            }
        }

        /**
         * Start polling for status
         */
        function startStatusPolling() {
            if (statusPollInterval) {
                clearInterval(statusPollInterval);
            }

            statusPollInterval = setInterval(function() {
                $.ajax({
                    url: ssCloudflareGithub.restUrl + 'is-running',
                    method: 'GET',
                    headers: {
                        'X-WP-Nonce': ssCloudflareGithub.nonce
                    },
                    success: function(response) {
                        var data = typeof response === 'string' ? JSON.parse(response) : response;
                        
                        if (!data.running && !data.paused) {
                            // Export finished
                            stopStatusPolling();
                            onDeployComplete();
                        }
                    },
                    error: function() {
                        // Keep polling even on error
                    }
                });

                // Also fetch the activity log
                fetchActivityLog();
            }, 1000); // Poll every 1 second for real-time updates
        }

        /**
         * Stop polling
         */
        function stopStatusPolling() {
            if (statusPollInterval) {
                clearInterval(statusPollInterval);
                statusPollInterval = null;
            }
        }

        /**
         * Fetch activity log from Simply Static debug.txt file (real-time line-by-line)
         */
        function fetchActivityLog() {
            // Fetch real-time log from debug.txt file
            $.ajax({
                url: ssCloudflareGithub.restUrl + 'debug-log',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: {
                    lines: 200,
                    since_line: lastDebugLine
                },
                success: function(response) {
                    var data = typeof response === 'string' ? JSON.parse(response) : response;
                    if (data.success && data.lines && data.lines.length > 0) {
                        updateLogFromDebugFile(data.lines);
                        // Update lastDebugLine to the highest line number
                        var maxLine = 0;
                        data.lines.forEach(function(line) {
                            if (line.line_num > maxLine) {
                                maxLine = line.line_num;
                            }
                        });
                        if (maxLine > lastDebugLine) {
                            lastDebugLine = maxLine;
                        }
                    }
                }
            });
        }

        /**
         * Update log from debug.txt file lines
         */
        function updateLogFromDebugFile(lines) {
            if (!lines || !Array.isArray(lines)) return;
            
            // Lines are in order, oldest first - prepend each so newest shows at top
            lines.forEach(function(lineObj) {
                var message = lineObj.text;
                if (!message || message.trim() === '') return;
                
                // Skip non-relevant debug lines (internal PHP errors, etc)
                if (message.includes('[internal]') || message.includes('Stack trace')) return;
                
                // Determine type based on content
                var type = 'info';
                if (message.includes('❌') || message.includes('Error') || message.includes('Failed')) {
                    type = 'error';
                } else if (message.includes('✅') || message.includes('Fetched:') || message.includes('complete') || message.includes('Success')) {
                    type = 'success';
                    if (message.includes('Fetched:')) statusCounts.crawl++;
                } else if (message.includes('🔍') || message.includes('Crawling:')) {
                    type = 'crawl';
                } else if (message.includes('⏭️') || message.includes('Skipped')) {
                    type = 'warning';
                } else if (message.includes('↪️') || message.includes('Redirect')) {
                    type = 'redirect';
                } else if (message.includes('📤') || message.includes('R2:') || message.includes('Uploading to R2')) {
                    type = 'r2';
                    if (message.includes('Uploaded')) statusCounts.r2++;
                } else if (message.includes('🐙') || message.includes('GitHub:')) {
                    type = 'github';
                    if (message.includes('Pushed')) statusCounts.github++;
                } else if (message.includes('🌐') || message.includes('Pages:')) {
                    type = 'pages';
                    if (message.includes('Triggered')) statusCounts.pages++;
                } else if (message.includes('🔗') || message.includes('Found')) {
                    type = 'info';
                } else if (message.includes('📁') || message.includes('rclone')) {
                    type = 'r2';
                }
                
                addLogEntry(message, type);
            });
            
            updateProgressFromCounts();
        }

        var lastLogId = 0;
        var seenMessages = new Set();  // Track seen messages to avoid duplicates
        var statusCounts = { r2: 0, github: 0, pages: 0, crawl: 0 };
        var lastActivityMessages = {};  // Track last message per task key to detect changes
        var lastDebugLine = 0;  // Track last line read from debug.txt

        /**
         * Update log from activity-log (real-time status messages)
         * PHP only stores ONE message per task, so we detect CHANGES to show updates
         */
        function updateLogFromActivityLog(activityData) {
            if (!activityData || typeof activityData !== 'object') return;
            
            // Activity data is an object with task names as keys (e.g., "fetch_urls", "r2_upload")
            Object.keys(activityData).forEach(function(key) {
                var entry = activityData[key];
                var message = '';
                
                // Entry can be string or object with {message, datetime}
                if (typeof entry === 'string') {
                    message = entry;
                } else if (entry && entry.message) {
                    message = entry.message;
                }
                
                if (!message) return;
                
                // Check if message changed from last time (PHP overwrites, so we catch updates)
                if (lastActivityMessages[key] === message) {
                    return; // Same message, skip
                }
                lastActivityMessages[key] = message;
                
                // Determine type based on content
                var type = 'info';
                if (message.includes('❌') || message.includes('Failed')) {
                    type = 'error';
                } else if (message.includes('✅') || message.includes('Fetched')) {
                    type = 'success';
                    statusCounts.crawl++;
                } else if (message.includes('🔍') || message.includes('Crawling:')) {
                    type = 'crawl';
                } else if (message.includes('⏭️') || message.includes('Skipped')) {
                    type = 'warning';
                } else if (message.includes('↪️') || message.includes('Redirect')) {
                    type = 'redirect';
                } else if (message.includes('R2:')) {
                    type = 'r2';
                    statusCounts.r2++;
                } else if (message.includes('GitHub:')) {
                    type = 'github';
                    statusCounts.github++;
                } else if (message.includes('Pages:')) {
                    type = 'pages';
                    statusCounts.pages++;
                } else if (message.includes('🔗') || message.includes('Found')) {
                    type = 'info';
                }
                
                addLogEntry(message, type);
            });
            
            updateProgressFromCounts();
        }

        /**
         * Update log from export data
         */
        function updateLogFromExport(rows) {
            // Rows from API are newest first
            // Reverse to process oldest first, so when prepending, newest ends up at top
            rows = rows.reverse();
            
            rows.forEach(function(row) {
                var message = '';
                var type = 'info';
                
                // Prioritize status_message for our detailed logs
                if (row.status_message && row.status_message.length > 0) {
                    message = row.status_message;
                } else if (row.url) {
                    message = row.url;
                } else {
                    return; // Skip empty entries
                }

                // Create unique key for this message
                var msgKey = message.substring(0, 100);
                if (seenMessages.has(msgKey)) {
                    return; // Skip duplicates
                }
                seenMessages.add(msgKey);

                // Determine type based on content
                if (message.includes('❌') || message.includes('error') || message.includes('Failed')) {
                    type = 'error';
                } else if (message.includes('✅') || message.includes('success') || message.includes('complete')) {
                    type = 'success';
                } else if (message.includes('⏭️') || message.includes('Skipped')) {
                    type = 'warning';
                } else if (message.includes('🔍') || message.includes('Crawling')) {
                    type = 'crawl';
                    statusCounts.crawl++;
                } else if (message.includes('↪️') || message.includes('Redirect')) {
                    type = 'redirect';
                    statusCounts.crawl++;
                } else if (message.includes('Fetched:')) {
                    type = 'success';
                    statusCounts.crawl++;
                } else if (message.includes('R2:')) {
                    type = 'r2';
                    statusCounts.r2++;
                } else if (message.includes('GitHub:')) {
                    type = 'github';
                    statusCounts.github++;
                } else if (message.includes('Pages:')) {
                    type = 'pages';
                    statusCounts.pages++;
                }

                // Determine type based on status code as fallback
                if (row.http_status_code) {
                    if (row.http_status_code >= 200 && row.http_status_code < 300) {
                        if (type === 'info') statusCounts.crawl++;
                    } else if (row.http_status_code >= 400) {
                        type = 'error';
                    }
                }

                addLogEntry(message, type);
                
                if (typeof row.id === 'number') {
                    lastLogId = Math.max(lastLogId, row.id);
                }
            });
            
            // Update progress estimate based on activity
            updateProgressFromCounts();
        }

        /**
         * Update progress bar based on status counts
         */
        function updateProgressFromCounts() {
            var totalActivity = statusCounts.crawl + statusCounts.r2 + statusCounts.github + statusCounts.pages;
            var statusText = 'Processing...';
            var percent = 10;

            if (statusCounts.pages > 0) {
                percent = 95;
                statusText = 'Cloudflare Pages: Building...';
            } else if (statusCounts.github > 0) {
                percent = 70 + Math.min(20, statusCounts.github);
                statusText = 'GitHub: Pushing files (' + statusCounts.github + ' processed)';
            } else if (statusCounts.r2 > 0) {
                percent = 40 + Math.min(25, statusCounts.r2);
                statusText = 'R2: Uploading images (' + statusCounts.r2 + ' processed)';
            } else if (statusCounts.crawl > 0) {
                percent = 10 + Math.min(25, Math.floor(statusCounts.crawl / 2));
                statusText = 'Crawling pages (' + statusCounts.crawl + ' found)';
            }

            updateProgress(Math.min(percent, 98), statusText);
        }

        /**
         * Handle deploy complete
         */
        function onDeployComplete() {
            isDeploying = false;
            $('#start-deploy').prop('disabled', false).show();
            $('#cancel-deploy').hide();
            updateProgress(100, '✅ Deployment complete!');
            addLogEntry('🎉 Deployment completed successfully!', 'success');
            
            // Reset counters for next deploy
            seenMessages.clear();
            lastActivityKeys.clear();
            statusCounts = { r2: 0, github: 0, pages: 0, crawl: 0 };
            lastLogId = 0;
            
            // Hide status after 5 seconds
            setTimeout(function() {
                $('#deploy-status').fadeOut();
            }, 5000);
        }

        /**
         * Handle deploy error
         */
        function onDeployError(message) {
            isDeploying = false;
            stopStatusPolling();
            $('#start-deploy').prop('disabled', false).show();
            $('#cancel-deploy').hide();
            $('#deploy-status').hide();
            addLogEntry('❌ Error: ' + message, 'error');
            
            // Reset counters
            seenMessages.clear();
            lastActivityKeys.clear();
            statusCounts = { r2: 0, github: 0, pages: 0, crawl: 0 };
            lastLogId = 0;
        }

        /**
         * Check if rclone is available
         */
        function checkRcloneAvailability() {
            return new Promise(function(resolve, reject) {
                $.ajax({
                    url: ssCloudflareGithub.restUrl + 'check-rclone',
                    method: 'GET',
                    headers: {
                        'X-WP-Nonce': ssCloudflareGithub.nonce
                    },
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr) {
                        reject('Failed to check rclone availability');
                    }
                });
            });
        }

        /**
         * Start the actual deployment
         */
        function startDeployment() {
            isDeploying = true;
            
            // Reset all tracking variables
            lastLogId = 0;
            seenMessages.clear();
            lastActivityMessages = {};  // Reset to detect fresh messages
            statusCounts = { r2: 0, github: 0, pages: 0, crawl: 0 };
            
            var $startBtn = $('#start-deploy');
            var $cancelBtn = $('#cancel-deploy');
            
            $startBtn.prop('disabled', true);
            $cancelBtn.show();
            
            $('#deploy-status').show();
            updateProgress(5, '🚀 Starting deployment...');
            
            // Clear old log entries
            $('#deploy-log').html('');
            addLogEntry('🚀 Starting static site generation...', 'info');
            addLogEntry('⏳ Crawling site, uploading to R2, pushing to GitHub, deploying to Pages...', 'info');
            
            $.ajax({
                url: ssCloudflareGithub.restUrl + 'start-export',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: JSON.stringify({
                    type: 'export'
                }),
                contentType: 'application/json',
                success: function(response) {
                    var data = typeof response === 'string' ? JSON.parse(response) : response;
                    
                    if (data.status === 200) {
                        addLogEntry('✅ Export started - watching for updates...', 'success');
                        updateProgress(10, '🔍 Discovering URLs...');
                        startStatusPolling();
                    } else if (data.status === 409) {
                        addLogEntry('⚠️ Export already running - resuming tracking', 'warning');
                        startStatusPolling();
                    } else {
                        onDeployError(data.message || 'Failed to start export');
                    }
                },
                error: function(xhr) {
                    var message = 'Failed to start export';
                    try {
                        var data = JSON.parse(xhr.responseText);
                        if (data.message) message = data.message;
                    } catch (e) {}
                    onDeployError(message);
                }
            });
        }

        // Start Deploy button
        $('#start-deploy').on('click', function() {
            if (isDeploying) return;
            
            var useRclone = $('input[name="simply-static[cloudflare_r2_use_rclone]"]').is(':checked');
            
            if (useRclone) {
                // Check if rclone is available before starting
                addLogEntry('Checking rclone availability...', 'info');
                
                checkRcloneAvailability().then(function(response) {
                    if (response.available) {
                        addLogEntry('rclone found at: ' + response.path, 'success');
                        startDeployment();
                    } else {
                        addLogEntry('ERROR: rclone is enabled but not installed on this server!', 'error');
                        addLogEntry('Please install rclone (https://rclone.org/install/) or disable the rclone option.', 'error');
                        alert('rclone is not installed on this server. Please install rclone or disable the "Use rclone" option.');
                    }
                }).catch(function(error) {
                    addLogEntry('Failed to check rclone: ' + error, 'error');
                    alert('Failed to check rclone availability. Please try again.');
                });
            } else {
                // No rclone, start directly
                startDeployment();
            }
        });

        // Cancel Deploy button
        $('#cancel-deploy').on('click', function() {
            if (!isDeploying) return;
            
            addLogEntry('Cancelling deployment...', 'warning');
            
            $.ajax({
                url: ssCloudflareGithub.restUrl + 'cancel-export',
                method: 'POST',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                success: function(response) {
                    stopStatusPolling();
                    isDeploying = false;
                    $('#start-deploy').prop('disabled', false).show();
                    $('#cancel-deploy').hide();
                    $('#deploy-status').hide();
                    addLogEntry('Deployment cancelled', 'warning');
                },
                error: function() {
                    addLogEntry('Failed to cancel deployment', 'error');
                }
            });
        });

        // Clear Log button
        $('#clear-log').on('click', function() {
            clearLog();
        });

        // Check if already running on page load
        $.ajax({
            url: ssCloudflareGithub.restUrl + 'is-running',
            method: 'GET',
            headers: {
                'X-WP-Nonce': ssCloudflareGithub.nonce
            },
            success: function(response) {
                var data = typeof response === 'string' ? JSON.parse(response) : response;
                
                if (data.running) {
                    isDeploying = true;
                    $('#start-deploy').prop('disabled', true);
                    $('#cancel-deploy').show();
                    $('#deploy-status').show();
                    updateProgress(50, 'Export in progress...');
                    addLogEntry('Export already in progress, resuming status tracking...', 'info');
                    startStatusPolling();
                }
            }
        });
    });
})(jQuery);
