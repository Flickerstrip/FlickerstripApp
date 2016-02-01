

cat iconsizes.txt | while read i
do
    TYPE=`echo $i | awk -F' ' '{print $1}'`
    SIZE=`echo $i | awk -F' ' '{print $2}'`
    W=`echo $SIZE | awk -F'x' '{print $1}'`
    H=`echo $SIZE | awk -F'x' '{print $2}'`
    convert logo_blackgb_rounded_corners.png -resize $i icon$i.png
    echo '<icon src="resources/icons/icon'$i'.png" width="'$W'" height="'$H'" />'
done
