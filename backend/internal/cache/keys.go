package cache

import "fmt"

const KeyPrefix = "webmetricsx"

// JobStateKey formats the key for storing temporary job execution state
func JobStateKey(jobID string) string {
	return fmt.Sprintf("%s:job:%s", KeyPrefix, jobID)
}

// CheckStateKey formats the key for storing the most recent check result for a target
func CheckStateKey(targetID string) string {
	return fmt.Sprintf("%s:check:%s", KeyPrefix, targetID)
}

// WorkerStateKey formats the key for storing temporary worker node heartbeat & metadata
func WorkerStateKey(workerID string) string {
	return fmt.Sprintf("%s:worker:%s", KeyPrefix, workerID)
}

// AlertCooldownKey formats the key used for alert cooldown tracking (Future Alert Engine)
func AlertCooldownKey(targetID, alertType string) string {
	return fmt.Sprintf("%s:cooldown:%s:%s", KeyPrefix, targetID, alertType)
}

// AlertDedupKey formats the key used for alert deduplication (Future Alert Engine)
func AlertDedupKey(targetID, hash string) string {
	return fmt.Sprintf("%s:dedup:%s:%s", KeyPrefix, targetID, hash)
}
