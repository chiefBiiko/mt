# mt
# obj prefixes:
#   d_ dirty
#   t_ tidy
# ----------------------------------------------------------------------------
mt <- list()
# reads meta information from webpages
mt$read <- function(URI=NULL, titl=T, desc=T, keyw=T) {
  if (missing(URI)) stop('no input URI!')
  if (!all(titl, desc, keyw)) stop('no output set!')
  rtn <- character()
  CON <- url(URI)
  on.exit(close(CON))
  d_src <- paste(try(readLines(CON)), collapse='')
  if (titl) {
    if(grepl('<title>.*</title>', d_src)) {
      t_titl <- gsub('.*<title>|</title>.*', '', d_src)
      rtn <- c(rtn, t_titl)
    } else {
      rtn <- c(rtn, NA)
    }
  }
  if (desc) {
    if (grepl('meta name=\"description\"', d_src)) {
      d_desc <- gsub('^.*(<meta name=\"description\"[^>]+>).*$', '\\1', d_src)
      t_desc <- gsub('^.*content=\"([^"]+)".*$', '\\1', d_desc)
      rtn <- c(rtn, t_desc)
    } else { 
      rtn <- c(rtn, NA)
    }
  }
  if (keyw) {
    if (grepl('meta name=\"keywords\"', d_src)) {
      d_desc <- gsub('^.*(<meta name=\"keywords\"[^>]+>).*$', '\\1', d_src)
      t_desc <- gsub('^.*content=\"([^"]+)".*$', '\\1', d_desc)
      rtn <- c(rtn, t_desc)
    } else { 
      rtn <- c(rtn, NA)
    }
  }
  return(rtn)
}
