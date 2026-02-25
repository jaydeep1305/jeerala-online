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
         * Add entry to log
         */
        function addLogEntry(message, type) {
            type = type || 'info';
            var $log = $('#deploy-log');
            var timestamp = '<span class="ss-cg-log-timestamp">[' + getTimestamp() + ']</span>';
            var entry = '<div class="ss-cg-log-entry ss-cg-log-' + type + '">' + timestamp + message + '</div>';
            $log.append(entry);
            // Scroll to bottom
            $log.scrollTop($log[0].scrollHeight);
        }

        /**
         * Clear log
         */
        function clearLog() {
            $('#deploy-log').html('<div class="ss-cg-log-entry ss-cg-log-info">Log cleared. Ready to deploy.</div>');
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
            }, 2000); // Poll every 2 seconds
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
         * Fetch activity log from Simply Static
         */
        function fetchActivityLog() {
            $.ajax({
                url: ssCloudflareGithub.restUrl + 'export-log',
                method: 'GET',
                headers: {
                    'X-WP-Nonce': ssCloudflareGithub.nonce
                },
                data: {
                    per_page: 20,
                    page: 1
                },
                success: function(response) {
                    var data = typeof response === 'string' ? JSON.parse(response) : response;
                    if (data.data && data.data.rows) {
                        updateLogFromExport(data.data.rows);
                    }
                }
            });
        }

        var lastLogId = 0;

        /**
         * Update log from export data
         */
        function updateLogFromExport(rows) {
            // Rows are ordered newest first, so reverse them
            rows = rows.reverse();
            
            rows.forEach(function(row) {
                // Use URL as unique identifier
                var logId = row.id || row.url;
                if (logId > lastLogId || (typeof logId === 'string' && !$('#deploy-log').text().includes(row.url))) {
                    var type = 'info';
                    var message = row.url;
                    
                    if (row.status_message) {
                        message = row.status_message;
                    }
                    
                    // Determine type based on status code
                    if (row.http_status_code >= 200 && row.http_status_code < 300) {
                        type = 'success';
                    } else if (row.http_status_code >= 400) {
                        type = 'error';
                    }
                    
                    // Only add if not already in log
                    if (!$('#deploy-log .ss-cg-log-entry:contains("' + message.substring(0, 50) + '")').length) {
                        addLogEntry(message, type);
                    }
                    
                    if (typeof logId === 'number') {
                        lastLogId = Math.max(lastLogId, logId);
                    }
                }
            });
            
            // Update progress estimate based on rows
            if (rows.length > 0) {
                // Rough progress estimate
                var processed = rows.filter(function(r) { return r.http_status_code; }).length;
                var total = rows.length + 10; // Estimate
                var percent = Math.min(90, Math.round((processed / total) * 100));
                updateProgress(percent, 'Processing pages... (' + processed + ' done)');
            }
        }

        /**
         * Handle deploy complete
         */
        function onDeployComplete() {
            isDeploying = false;
            $('#start-deploy').prop('disabled', false).show();
            $('#cancel-deploy').hide();
            updateProgress(100, 'Deployment complete!');
            addLogEntry('Deployment completed successfully!', 'success');
            
            // Hide status after 3 seconds
            setTimeout(function() {
                $('#deploy-status').fadeOut();
            }, 3000);
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
            addLogEntry('Error: ' + message, 'error');
        }

        // Start Deploy button
        $('#start-deploy').on('click', function() {
            if (isDeploying) return;
            
            isDeploying = true;
            lastLogId = 0;
            
            var $startBtn = $(this);
            var $cancelBtn = $('#cancel-deploy');
            
            $startBtn.prop('disabled', true);
            $cancelBtn.show();
            
            $('#deploy-status').show();
            updateProgress(5, 'Starting deployment...');
            
            // Clear old log entries except the ready message
            $('#deploy-log').html('');
            addLogEntry('Starting static site generation...', 'info');
            
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
                        addLogEntry('Export started successfully', 'success');
                        updateProgress(10, 'Crawling pages...');
                        startStatusPolling();
                    } else if (data.status === 409) {
                        addLogEntry('Export already running', 'warning');
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
