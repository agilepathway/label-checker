/*
Package slice provides utility functions for slices
*/
package slice

import (
	"strings"
)

// Contains returns true if the given slice contains the given string
func Contains(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}

	return false
}

// StartsWithAnyOf returns true if the given slice starts with any of the given prefixes
func StartsWithAnyOf(prefixes []string, candidate string) bool {
	for _, prefix := range prefixes {
		if strings.HasPrefix(candidate, prefix) {
			return true
		}
	}

	return false
}
