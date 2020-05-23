/*
Package error provides error utility methods
*/
package error

import "log"

// PanicIfError panics if the error passed in is not nil
func PanicIfError(err error) {
	if err != nil {
		log.Fatalf("Error that we cannot handle, %v", err)
	}
}
