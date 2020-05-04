package github

import "log"

func panicIfError(err error) {
	if err != nil {
		log.Fatalf("Error that we cannot handle, %v", err)
	}
}
