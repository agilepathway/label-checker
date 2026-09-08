/*
Package panic provides utility panic functions
*/
package panic

import "log"

// IfError panics if the error passed in is not nil
func IfError(err error) {
	if err != nil {
		log.Fatalf("Error that we cannot handle, %v", err)
	}
}
