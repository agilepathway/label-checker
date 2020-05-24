/*
Package slice provides utility functions for slices
*/
package slice

// Contains returns true if the given slice contains the given string
func Contains(slice []string, val string) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}

	return false
}
